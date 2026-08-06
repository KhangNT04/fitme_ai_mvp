package com.fitme.preview.service;

import com.fitme.ai.VtonCategoryMapper;
import com.fitme.ai.VtonImageUrlResolver;
import com.fitme.ai.client.AiVtonClient;
import com.fitme.ai.client.AiVtonClient.VtonJobResponse;
import com.fitme.billing.service.BrandQuotaService;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.PreviewSource;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.enums.TryOnPreviewMode;
import com.fitme.common.enums.TryOnStatus;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.repository.PreviewGenerationRepository;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.tryon.entity.TryOnItem;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnItemRepository;
import com.fitme.tryon.repository.TryOnRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class VtonTryOnService {

    private static final String VTON_DISCLAIMER =
            "Ảnh thử mặc được tạo bằng AI — tham khảo phối đồ. Form thực tế có thể khác tùy size và chất liệu.";
    private static final String VTON_COMPOSITE_DISCLAIMER =
            "Ảnh ghép minh họa tạm thời — dịch vụ AI thử mặc đang gián đoạn. Tham khảo phối đồ, form thực tế có thể khác.";

    /**
     * In-memory step progress for sequential multi-garment jobs (top → bottom), keyed by
     * try-on request id. Not persisted — purely to let the frontend show "Đang mặc áo...
     * (1/2)" instead of one opaque spinner while polling; safe to lose on restart since the
     * next poll just re-fetches from ai-vton. Cleared once the job leaves PROCESSING.
     */
    private final Map<UUID, String> vtonProgressLabels = new ConcurrentHashMap<>();

    private final TryOnRequestRepository tryOnRequestRepository;
    private final TryOnItemRepository tryOnItemRepository;
    private final PreviewGenerationRepository previewRepository;
    private final PreviewGenerator previewGenerator;
    private final ProductRepository productRepository;
    private final BrandQuotaService brandQuotaService;
    private final AiVtonClient aiVtonClient;
    private final VtonCategoryMapper vtonCategoryMapper;
    private final VtonImageUrlResolver vtonImageUrlResolver;
    private final VtonOutputMirrorService vtonOutputMirrorService;
    private final FitMeProperties fitMeProperties;

    @Transactional
    public void startJob(TryOnRequest tryOn) {
        PreviewType previewType = toPreviewType(tryOn.getPreviewMode());
        PreviewGeneration preview = PreviewGeneration.builder()
                .tryOnRequestId(tryOn.getId())
                .photoUploadId(tryOn.getPhotoUploadId())
                .previewType(previewType)
                .status(PreviewStatus.PROCESSING)
                .build();
        preview = previewRepository.save(preview);
        tryOn.setPreviewGenerationId(preview.getId());

        if (shouldUseAsyncVton(tryOn)) {
            dispatchAsyncVton(tryOn, preview);
            previewRepository.save(preview);
            tryOnRequestRepository.save(tryOn);
            return;
        }

        completeSyncPreview(tryOn, preview);
        previewRepository.save(preview);
        tryOnRequestRepository.save(tryOn);
    }

    @Transactional
    public void pollProcessingJobs() {
        List<PreviewGeneration> processing = previewRepository.findByStatus(PreviewStatus.PROCESSING);
        for (PreviewGeneration preview : processing) {
            if (preview.getVtonJobId() == null || preview.getVtonJobId().isBlank()) {
                continue;
            }
            pollSingleJob(preview);
        }
    }

    @Transactional
    public void pollForTryOn(UUID tryOnRequestId) {
        findPreviewForTryOn(tryOnRequestId).ifPresent(preview -> {
            if (preview.getStatus() == PreviewStatus.PROCESSING
                    && preview.getVtonJobId() != null
                    && !preview.getVtonJobId().isBlank()) {
                pollSingleJob(preview);
            }
        });
    }

    public Optional<PreviewGeneration> findPreviewForTryOn(UUID tryOnRequestId) {
        List<PreviewGeneration> previews = previewRepository.findByTryOnRequestId(tryOnRequestId);
        if (previews.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(previews.getLast());
    }

    /**
     * Step-aware progress label for a sequential (2+ garment) VTON job currently
     * PROCESSING, e.g. "Đang mặc áo... (1/2)". Empty for single-garment jobs or once the
     * step info hasn't arrived yet — callers should fall back to a generic loading message.
     */
    public Optional<String> getProcessingStepLabel(UUID tryOnRequestId) {
        return Optional.ofNullable(vtonProgressLabels.get(tryOnRequestId));
    }

    private static String buildProgressLabel(Integer step, Integer totalSteps, String currentCategory) {
        String garmentLabel = switch (currentCategory == null ? "" : currentCategory) {
            case "tops" -> "áo";
            case "bottoms" -> "quần";
            case "one-pieces" -> "váy/đầm";
            default -> "trang phục";
        };
        int safeStep = step != null && step > 0 ? step : 1;
        return "Đang mặc %s... (%d/%d)".formatted(garmentLabel, safeStep, totalSteps);
    }

    private boolean shouldUseAsyncVton(TryOnRequest tryOn) {
        if (!aiVtonClient.isVtonEnabled()) {
            return false;
        }
        TryOnPreviewMode mode = tryOn.getPreviewMode();
        return mode == TryOnPreviewMode.USER_PHOTO || mode == TryOnPreviewMode.AVATAR;
    }

    private void dispatchAsyncVton(TryOnRequest tryOn, PreviewGeneration preview) {
        List<TryOnItem> items = tryOnItemRepository.findByTryOnRequestId(tryOn.getId());
        List<VtonCategoryMapper.GarmentSelection> garments = vtonCategoryMapper.selectGarments(items);
        if (garments.isEmpty()) {
            log.info("No VTON-eligible garment for try-on {}, falling back to outfit board", tryOn.getId());
            completeSyncPreview(tryOn, preview);
            return;
        }

        try {
            String personUrl = vtonImageUrlResolver.resolvePersonUrl(tryOn);
            log.info("VTON dispatch try-on {} garments={} personUrl={}",
                    tryOn.getId(),
                    garments.stream().map(VtonCategoryMapper.GarmentSelection::productName).toList(),
                    personUrl);
            VtonJobResponse job = garments.size() == 1
                    ? aiVtonClient.submitJob(
                            personUrl,
                            garments.get(0).garmentImageUrl(),
                            garments.get(0).category(),
                            garments.get(0).productName())
                    : aiVtonClient.submitSequentialJob(personUrl, garments);

            if (job == null || "failed".equalsIgnoreCase(job.getStatus())) {
                applyVtonFailure(tryOn, preview, job != null ? job.getErrorCode() : "PROVIDER_ERROR",
                        job != null ? job.getErrorMessage() : "VTON submit failed");
                return;
            }

            if (job.getJobId() == null || job.getJobId().isBlank()) {
                applyVtonFailure(tryOn, preview, "PROVIDER_ERROR", "VTON provider did not return job id");
                return;
            }
            preview.setVtonJobId(job.getJobId());
            preview.setDisclaimer(VTON_DISCLAIMER);
            preview.setPreviewSource(PreviewSource.VTON);
            tryOn.setStatus(TryOnStatus.PROCESSING);
        } catch (Exception ex) {
            log.warn("Async VTON dispatch failed for try-on {}: reason={} message={}",
                    tryOn.getId(), classifyVtonFailure(null, ex.getMessage()), ex.getMessage());
            applyVtonFailure(tryOn, preview, null, ex.getMessage());
        }
    }

    private void pollSingleJob(PreviewGeneration preview) {
        PreviewGeneration fresh = previewRepository.findById(preview.getId()).orElse(null);
        if (fresh == null || fresh.getStatus() != PreviewStatus.PROCESSING) {
            return;
        }
        preview = fresh;

        if (isTimedOut(preview)) {
            finalizeTimeout(preview);
            return;
        }

        VtonJobResponse response = aiVtonClient.pollJob(preview.getVtonJobId());
        if (response == null || response.getStatus() == null || response.getStatus().isBlank()) {
            return;
        }

        String status = response.getStatus().toLowerCase();
        if ("processing".equals(status)) {
            if (preview.getTryOnRequestId() != null && response.getTotalSteps() != null) {
                vtonProgressLabels.put(
                        preview.getTryOnRequestId(),
                        buildProgressLabel(response.getStep(), response.getTotalSteps(), response.getCurrentCategory()));
            }
            return;
        }

        TryOnRequest tryOn = preview.getTryOnRequestId() != null
                ? tryOnRequestRepository.findById(preview.getTryOnRequestId()).orElse(null)
                : null;
        if (tryOn == null) {
            return;
        }
        if (tryOn.getId() != null) {
            vtonProgressLabels.remove(tryOn.getId());
        }
        if (tryOn.getStatus() == TryOnStatus.COMPLETED || tryOn.getStatus() == TryOnStatus.FAILED) {
            return;
        }

        if ("completed".equals(status) && response.getOutputImageUrl() != null
                && !response.getOutputImageUrl().isBlank()) {
            String previewImageUrl = response.getOutputImageUrl();
            try {
                previewImageUrl = vtonOutputMirrorService.persistRemoteOutput(previewImageUrl, preview.getId());
            } catch (Exception ex) {
                log.warn("Could not persist VTON output for preview {}: {}", preview.getId(), ex.getMessage());
            }
            if (VtonOutputMirrorService.isEphemeralVtonOutputUrl(previewImageUrl)) {
                log.info("VTON output not yet mirrored for preview {}, will retry on next poll", preview.getId());
                return;
            }
            preview.setPreviewImageUrl(previewImageUrl);
            preview.setDisclaimer(resolveVtonDisclaimer(response));
            preview.setStatus(PreviewStatus.SUCCEEDED);
            preview.setPreviewSource(PreviewSource.VTON);
            preview.setErrorMessage(null);
            tryOn.setStatus(TryOnStatus.COMPLETED);
            consumeQuotaForTryOn(tryOn.getId());
        } else if ("failed".equals(status)) {
            applyVtonFailure(tryOn, preview, response.getErrorCode(),
                    response.getErrorMessage() != null ? response.getErrorMessage() : "VTON job failed");
        } else {
            log.warn("Unexpected VTON status '{}' for preview {}", status, preview.getId());
            return;
        }

        previewRepository.save(preview);
        tryOnRequestRepository.save(tryOn);
    }

    private void applyVtonFailure(TryOnRequest tryOn, PreviewGeneration preview, String errorCode, String message) {
        if (tryOn.getId() != null) {
            vtonProgressLabels.remove(tryOn.getId());
        }
        try {
            PreviewGenerator.PreviewResult fallback = previewGenerator.generate(
                    new PreviewGenerator.PreviewRequest(null, tryOn.getId(), tryOn.getPhotoUploadId(),
                            preview.getPreviewType(), tryOn.getAvatarKey()));
            preview.setPreviewImageUrl(fallback.imageUrl());
            preview.setDisclaimer(fallback.disclaimer() + " (Fallback minh họa khi VTON thất bại.)");
            preview.setStatus(PreviewStatus.SUCCEEDED);
            preview.setPreviewSource(resolveSyncPreviewSource(tryOn.getPreviewMode()));
            preview.setErrorMessage(sanitizeVtonErrorMessage(errorCode, message));
            tryOn.setStatus(TryOnStatus.COMPLETED);
            consumeQuotaForTryOn(tryOn.getId());
        } catch (Exception ex) {
            preview.setStatus(PreviewStatus.FAILED);
            preview.setErrorMessage(message != null ? message : ex.getMessage());
            tryOn.setStatus(TryOnStatus.FAILED);
        }
    }

    private void finalizeTimeout(PreviewGeneration preview) {
        TryOnRequest tryOn = preview.getTryOnRequestId() != null
                ? tryOnRequestRepository.findById(preview.getTryOnRequestId()).orElse(null)
                : null;
        if (tryOn == null) {
            return;
        }
        applyVtonFailure(tryOn, preview, "TIMEOUT", "VTON timeout — vượt quá thời gian chờ");
        previewRepository.save(preview);
        tryOnRequestRepository.save(tryOn);
    }

    private boolean isTimedOut(PreviewGeneration preview) {
        Instant created = preview.getCreatedAt();
        if (created == null) {
            return false;
        }
        long timeoutSeconds = fitMeProperties.getAi().getJobTimeoutSeconds();
        return Duration.between(created, Instant.now()).getSeconds() > timeoutSeconds;
    }

    private void completeSyncPreview(TryOnRequest tryOn, PreviewGeneration preview) {
        try {
            PreviewGenerator.PreviewResult result = previewGenerator.generate(
                    new PreviewGenerator.PreviewRequest(null, tryOn.getId(), tryOn.getPhotoUploadId(),
                            preview.getPreviewType(), tryOn.getAvatarKey()));
            preview.setPreviewImageUrl(result.imageUrl());
            preview.setDisclaimer(result.disclaimer());
            preview.setStatus(PreviewStatus.SUCCEEDED);
            preview.setPreviewSource(resolveSyncPreviewSource(tryOn.getPreviewMode()));
            tryOn.setStatus(TryOnStatus.COMPLETED);
            consumeQuotaForTryOn(tryOn.getId());
        } catch (Exception e) {
            preview.setStatus(PreviewStatus.FAILED);
            preview.setErrorMessage(e.getMessage());
            tryOn.setStatus(TryOnStatus.FAILED);
        }
    }

    private void consumeQuotaForTryOn(UUID tryOnRequestId) {
        Set<UUID> brandIds = new LinkedHashSet<>();
        for (TryOnItem item : tryOnItemRepository.findByTryOnRequestId(tryOnRequestId)) {
            productRepository.findById(item.getProductId())
                    .map(Product::getBrandId)
                    .ifPresent(brandIds::add);
        }
        brandQuotaService.consumeForTryOn(tryOnRequestId, brandIds);
    }

    private static PreviewType toPreviewType(TryOnPreviewMode mode) {
        if (mode == null) {
            return PreviewType.OUTFIT_BOARD;
        }
        return switch (mode) {
            case USER_PHOTO -> PreviewType.USER_PHOTO_2D;
            case AVATAR -> PreviewType.AVATAR;
            case OUTFIT_BOARD_ONLY -> PreviewType.OUTFIT_BOARD;
        };
    }

    private static String resolveVtonDisclaimer(VtonJobResponse response) {
        if (response.getFallbackMode() != null
                && "composite".equalsIgnoreCase(response.getFallbackMode().trim())) {
            return VTON_COMPOSITE_DISCLAIMER;
        }
        return VTON_DISCLAIMER;
    }

    private static PreviewSource resolveSyncPreviewSource(TryOnPreviewMode mode) {
        if (mode == null) {
            return PreviewSource.OUTFIT_BOARD;
        }
        return switch (mode) {
            case USER_PHOTO -> PreviewSource.USER_PHOTO;
            case AVATAR -> PreviewSource.AVATAR;
            case OUTFIT_BOARD_ONLY -> PreviewSource.OUTFIT_BOARD;
        };
    }

    /**
     * Maps a VTON failure to a Vietnamese toast message. Prefers ai-vton's structured
     * {@code error_code} (see docs/FASHN_VTON_INTEGRATION.md §1 "Error codes" — RATE_LIMIT,
     * OUT_OF_CREDITS, UNAUTHORIZED, INVALID_IMAGE, UNSUPPORTED_CATEGORY, TIMEOUT,
     * PROVIDER_ERROR) over pattern-matching the raw message, which only kicks in when no
     * code is available (e.g. a network-level exception before ai-vton ever responded).
     */
    private static String sanitizeVtonErrorMessage(String errorCode, String message) {
        if (errorCode != null && !errorCode.isBlank()) {
            String mapped = switch (errorCode.trim().toUpperCase(java.util.Locale.ROOT)) {
                case "RATE_LIMIT" -> "AI thử mặc đang quá tải (giới hạn tốc độ) — thử lại sau ít phút hoặc xem ảnh minh họa.";
                case "OUT_OF_CREDITS" -> "AI thử mặc đã hết credit — thử lại sau hoặc xem ảnh minh họa.";
                case "UNAUTHORIZED" -> "Cấu hình API key AI thử mặc chưa đúng — xem ảnh minh họa thay thế.";
                case "INVALID_IMAGE" -> "Ảnh không hợp lệ để AI ghép đồ — vui lòng upload ảnh rõ mặt/toàn thân khác.";
                case "UNSUPPORTED_CATEGORY" -> "Món đồ này chưa hỗ trợ thử mặc AI — xem ảnh minh họa phối đồ.";
                case "TIMEOUT" -> "AI thử mặc mất quá nhiều thời gian — xem ảnh minh họa thay thế.";
                default -> null;
            };
            if (mapped != null) {
                return mapped;
            }
        }
        if (message == null || message.isBlank()) {
            return "Dịch vụ AI thử mặc tạm thời không khả dụng.";
        }
        String lower = message.toLowerCase();
        if (lower.contains("gradio") || lower.contains("upstream")) {
            return "Dịch vụ AI thử mặc đang gặp sự cố. Bạn vẫn xem được ảnh minh họa bên dưới.";
        }
        if (lower.contains("429") || lower.contains("quota") || lower.contains("rate limit")
                || lower.contains("outofcredits") || lower.contains("out of credits") || lower.contains("credit")) {
            return "AI thử mặc đã hết quota/credit — thử lại sau hoặc xem ảnh minh họa.";
        }
        if (lower.contains("unauthorized") || lower.contains("invalid token") || lower.contains("api key")) {
            return "Cấu hình API key AI thử mặc chưa đúng — xem ảnh minh họa thay thế.";
        }
        if (lower.contains("timeout") || lower.contains("timed out")) {
            return "AI thử mặc mất quá nhiều thời gian — xem ảnh minh họa thay thế.";
        }
        if (lower.contains("url") || lower.contains("fetch") || lower.contains("404")
                || lower.contains("imageloaderror")) {
            return "Không truy cập được ảnh để ghép đồ — kiểm tra lại ảnh đã upload.";
        }
        return message.length() > 200 ? message.substring(0, 200) + "…" : message;
    }

    private static String classifyVtonFailure(String errorCode, String message) {
        if (errorCode != null && !errorCode.isBlank()) {
            return switch (errorCode.trim().toUpperCase(java.util.Locale.ROOT)) {
                case "RATE_LIMIT", "OUT_OF_CREDITS" -> "quota_exceeded";
                case "UNAUTHORIZED" -> "unauthorized";
                case "TIMEOUT" -> "timeout";
                case "INVALID_IMAGE" -> "person_url_unreachable";
                case "UNSUPPORTED_CATEGORY" -> "unsupported_category";
                default -> "provider_error";
            };
        }
        if (message == null || message.isBlank()) {
            return "unknown";
        }
        String lower = message.toLowerCase();
        if (lower.contains("429") || lower.contains("quota") || lower.contains("rate limit")
                || lower.contains("credit")) {
            return "quota_exceeded";
        }
        if (lower.contains("unauthorized") || lower.contains("invalid token") || lower.contains("api key")) {
            return "unauthorized";
        }
        if (lower.contains("timeout") || lower.contains("timed out")) {
            return "timeout";
        }
        if (lower.contains("url") || lower.contains("fetch") || lower.contains("download")
                || lower.contains("404") || lower.contains("not found") || lower.contains("imageloaderror")) {
            return "person_url_unreachable";
        }
        return "provider_error";
    }
}
