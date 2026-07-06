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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VtonTryOnService {

    private static final String VTON_DISCLAIMER =
            "Ảnh thử mặc được tạo bằng AI — tham khảo phối đồ. Form thực tế có thể khác tùy size và chất liệu.";
    private static final String VTON_COMPOSITE_DISCLAIMER =
            "Ảnh ghép minh họa tạm thời — dịch vụ AI thử mặc đang gián đoạn. Tham khảo phối đồ, form thực tế có thể khác.";

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

    private boolean shouldUseAsyncVton(TryOnRequest tryOn) {
        if (!aiVtonClient.isVtonEnabled()) {
            return false;
        }
        TryOnPreviewMode mode = tryOn.getPreviewMode();
        return mode == TryOnPreviewMode.USER_PHOTO || mode == TryOnPreviewMode.AVATAR;
    }

    private void dispatchAsyncVton(TryOnRequest tryOn, PreviewGeneration preview) {
        List<TryOnItem> items = tryOnItemRepository.findByTryOnRequestId(tryOn.getId());
        Optional<VtonCategoryMapper.GarmentSelection> garment = vtonCategoryMapper.selectGarment(items);
        if (garment.isEmpty()) {
            log.info("No VTON-eligible garment for try-on {}, falling back to outfit board", tryOn.getId());
            completeSyncPreview(tryOn, preview);
            return;
        }

        try {
            String personUrl = vtonImageUrlResolver.resolvePersonUrl(tryOn);
            VtonCategoryMapper.GarmentSelection selected = garment.get();
            log.info("VTON dispatch try-on {} personUrl={} garmentUrl={}",
                    tryOn.getId(), personUrl, selected.garmentImageUrl());
            VtonJobResponse job = aiVtonClient.submitJob(
                    personUrl,
                    selected.garmentImageUrl(),
                    selected.category());

            if (job == null || "failed".equalsIgnoreCase(job.getStatus())) {
                applyVtonFailure(tryOn, preview, job != null ? job.getErrorMessage() : "VTON submit failed");
                return;
            }

            if (job.getJobId() == null || job.getJobId().isBlank()) {
                applyVtonFailure(tryOn, preview, "VTON provider did not return job id");
                return;
            }
            preview.setVtonJobId(job.getJobId());
            preview.setDisclaimer(VTON_DISCLAIMER);
            preview.setPreviewSource(PreviewSource.VTON);
            tryOn.setStatus(TryOnStatus.PROCESSING);
        } catch (Exception ex) {
            log.warn("Async VTON dispatch failed for try-on {}: reason={} message={}",
                    tryOn.getId(), classifyVtonFailure(ex.getMessage()), ex.getMessage());
            applyVtonFailure(tryOn, preview, ex.getMessage());
        }
    }

    private void pollSingleJob(PreviewGeneration preview) {
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
            return;
        }

        TryOnRequest tryOn = preview.getTryOnRequestId() != null
                ? tryOnRequestRepository.findById(preview.getTryOnRequestId()).orElse(null)
                : null;
        if (tryOn == null) {
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
            applyVtonFailure(tryOn, preview,
                    response.getErrorMessage() != null ? response.getErrorMessage() : "VTON job failed");
        } else {
            log.warn("Unexpected VTON status '{}' for preview {}", status, preview.getId());
            return;
        }

        previewRepository.save(preview);
        tryOnRequestRepository.save(tryOn);
    }

    private void applyVtonFailure(TryOnRequest tryOn, PreviewGeneration preview, String message) {
        try {
            PreviewGenerator.PreviewResult fallback = previewGenerator.generate(
                    new PreviewGenerator.PreviewRequest(null, tryOn.getId(), tryOn.getPhotoUploadId(),
                            preview.getPreviewType(), tryOn.getAvatarKey()));
            preview.setPreviewImageUrl(fallback.imageUrl());
            preview.setDisclaimer(fallback.disclaimer() + " (Fallback minh họa khi VTON thất bại.)");
            preview.setStatus(PreviewStatus.SUCCEEDED);
            preview.setPreviewSource(resolveSyncPreviewSource(tryOn.getPreviewMode()));
            preview.setErrorMessage(sanitizeVtonErrorMessage(message));
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
        applyVtonFailure(tryOn, preview, "VTON timeout — vượt quá thời gian chờ");
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

    private static String sanitizeVtonErrorMessage(String message) {
        if (message == null || message.isBlank()) {
            return "Dịch vụ AI thử mặc tạm thời không khả dụng.";
        }
        String lower = message.toLowerCase();
        if (lower.contains("gradio") || lower.contains("upstream")) {
            return "Dịch vụ AI thử mặc đang gặp sự cố. Bạn vẫn xem được ảnh minh họa bên dưới.";
        }
        if (lower.contains("429") || lower.contains("quota") || lower.contains("rate limit")) {
            return "AI thử mặc đã hết quota — thử lại sau hoặc xem ảnh minh họa.";
        }
        if (lower.contains("timeout") || lower.contains("timed out")) {
            return "AI thử mặc mất quá nhiều thời gian — xem ảnh minh họa thay thế.";
        }
        if (lower.contains("url") || lower.contains("fetch") || lower.contains("404")) {
            return "Không truy cập được ảnh để ghép đồ — kiểm tra lại ảnh đã upload.";
        }
        return message.length() > 200 ? message.substring(0, 200) + "…" : message;
    }

    private static String classifyVtonFailure(String message) {
        if (message == null || message.isBlank()) {
            return "unknown";
        }
        String lower = message.toLowerCase();
        if (lower.contains("429") || lower.contains("quota") || lower.contains("rate limit")) {
            return "quota_exceeded";
        }
        if (lower.contains("timeout") || lower.contains("timed out")) {
            return "timeout";
        }
        if (lower.contains("url") || lower.contains("fetch") || lower.contains("download")
                || lower.contains("404") || lower.contains("not found")) {
            return "person_url_unreachable";
        }
        return "provider_error";
    }
}
