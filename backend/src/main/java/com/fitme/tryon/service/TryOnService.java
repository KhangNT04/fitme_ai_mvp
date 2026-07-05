package com.fitme.tryon.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.billing.service.BrandQuotaService;
import com.fitme.common.enums.PhotoQualityStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.enums.TryOnPreviewMode;
import com.fitme.common.enums.TryOnStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.preview.service.PhotoUploadService;
import com.fitme.preview.service.VtonTryOnService;
import com.fitme.common.enums.ItemRole;
import com.fitme.tryon.dto.*;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.recommendation.service.SizeResolutionService;
import com.fitme.tryon.entity.TryOnItem;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnItemRepository;
import com.fitme.tryon.repository.TryOnRequestRepository;
import com.fitme.tryon.support.TryOnAvatarPresets;
import com.fitme.tryon.support.TryOnItemRoleRules;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.service.BodyProfileService;
import com.fitme.userprofile.service.StyleProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TryOnService {

    private final TryOnRequestRepository tryOnRequestRepository;
    private final TryOnItemRepository tryOnItemRepository;
    private final VtonTryOnService vtonTryOnService;
    private final AnalyticsService analyticsService;
    private final ProductRepository productRepository;
    private final BrandQuotaService brandQuotaService;
    private final PhotoUploadService photoUploadService;
    private final TryOnOutfitCompletionService outfitCompletionService;
    private final OutfitCompositionService outfitCompositionService;
    private final SizeResolutionService sizeResolutionService;
    private final BodyProfileService bodyProfileService;
    private final StyleProfileService styleProfileService;

    @Transactional
    public TryOnResponse create(CreateTryOnRequest request) {
        TryOnPreviewMode previewMode = request.getPreviewMode() != null
                ? request.getPreviewMode()
                : TryOnPreviewMode.OUTFIT_BOARD_ONLY;
        validatePreviewMode(request, previewMode);

        TryOnRequest entity = TryOnRequest.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .photoUploadId(request.getPhotoUploadId())
                .previewMode(previewMode)
                .avatarKey(request.getAvatarKey())
                .occasion(request.getOccasion())
                .desiredVibe(request.getDesiredVibe())
                .preferredFit(request.getPreferredFit())
                .comfortPreference(request.getComfortPreference())
                .normallyWornTopSize(request.getNormallyWornTopSize())
                .normallyWornBottomSize(request.getNormallyWornBottomSize())
                .heightCm(request.getHeightCm())
                .weightKg(request.getWeightKg())
                .skinTone(request.getSkinTone())
                .status(TryOnStatus.DRAFT)
                .build();
        entity = tryOnRequestRepository.save(entity);
        analyticsService.track("TRY_ON_STARTED", entity.getUserId(), entity.getSessionId(),
                null, null, null, entity.getId(), null);
        return toResponse(entity);
    }

    public TryOnResponse get(UUID id) {
        TryOnRequest tryOn = getOwned(id);
        TryOnResponse response = toResponse(tryOn);
        attachItemDetails(tryOn, response);
        attachPreviewIfReady(tryOn, response);
        return response;
    }

    @Transactional
    public TryOnResponse addItem(UUID id, AddTryOnItemRequest request) {
        TryOnRequest tryOn = getOwned(id);
        List<TryOnItem> existing = tryOnItemRepository.findByTryOnRequestId(id);
        if (existing.stream().anyMatch(item -> item.getProductId().equals(request.getProductId()))) {
            return toResponse(tryOn);
        }

        ItemRole role = request.getRole();
        Set<ItemRole> rolesToReplace = TryOnItemRoleRules.rolesToReplaceWhenAdding(role);
        existing.stream()
                .filter(item -> rolesToReplace.contains(item.getRole()))
                .forEach(tryOnItemRepository::delete);

        tryOnItemRepository.save(TryOnItem.builder()
                .tryOnRequestId(id)
                .productId(request.getProductId())
                .role(role)
                .selectedSize(request.getSelectedSize())
                .selectedColor(request.getSelectedColor())
                .build());
        return toResponse(tryOn);
    }

    @Transactional
    public TryOnResponse generate(UUID id) {
        TryOnRequest tryOn = getOwned(id);
        var items = tryOnItemRepository.findByTryOnRequestId(id);
        if (items.isEmpty()) {
            throw new BusinessException("Cần thêm ít nhất một sản phẩm");
        }
        var brandIds = items.stream()
                .map(TryOnItem::getProductId)
                .map(productRepository::findById)
                .filter(java.util.Optional::isPresent)
                .map(opt -> opt.get().getBrandId())
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
        brandQuotaService.precheckQuotaForBrands(brandIds);

        tryOn.setStatus(TryOnStatus.PROCESSING);
        tryOnRequestRepository.save(tryOn);
        vtonTryOnService.startJob(tryOn);
        tryOn = tryOnRequestRepository.findById(id).orElseThrow();
        analyticsService.track("TRY_ON_GENERATED", tryOn.getUserId(), tryOn.getSessionId(),
                null, null, null, id, null);
        TryOnResponse response = toResponse(tryOn);
        attachItemDetails(tryOn, response);
        attachPreviewIfReady(tryOn, response);
        attachOutfitCompletion(tryOn.getId(), response);
        return response;
    }

    public TryOnResponse getResult(UUID id) {
        TryOnRequest tryOn = getOwned(id);
        TryOnResponse response = toResponse(tryOn);
        attachItemDetails(tryOn, response);
        attachPreviewIfReady(tryOn, response);
        attachOutfitCompletion(id, response);
        return response;
    }

    @Transactional
    public TryOnResponse variantColor(UUID id, VariantRequest request) {
        updateVariant(id, request, "COLOR_COMPARED");
        return get(id);
    }

    @Transactional
    public TryOnResponse variantSize(UUID id, VariantRequest request) {
        updateVariant(id, request, "SIZE_COMPARED");
        return get(id);
    }

    @Transactional
    public TryOnResponse variantForm(UUID id, VariantRequest request) {
        updateVariant(id, request, "FORM_COMPARED");
        return get(id);
    }

    @Transactional
    public void save(UUID id) {
        TryOnRequest tryOn = getOwned(id);
        if (tryOn.getStatus() != TryOnStatus.COMPLETED) {
            throw new BusinessException("Chỉ lưu được kết quả đã hoàn thành");
        }
        RequestContext.getCurrentUserId().ifPresent(userId -> {
            if (tryOn.getUserId() == null) {
                tryOn.setUserId(userId);
            }
        });
        tryOn.setSaved(true);
        tryOnRequestRepository.save(tryOn);
        analyticsService.track("OUTFIT_SAVED", RequestContext.getCurrentUserId().orElse(null),
                RequestContext.getSessionId().orElse(null), null, null, null, id, null);
    }

    @Transactional
    public void unsave(UUID id) {
        TryOnRequest tryOn = getOwned(id);
        if (!tryOn.isSaved()) {
            return;
        }
        tryOn.setSaved(false);
        tryOnRequestRepository.save(tryOn);
    }

    public List<TryOnResponse> getSaved() {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId == null && sessionId == null) {
            return List.of();
        }
        LinkedHashMap<UUID, TryOnRequest> merged = new LinkedHashMap<>();
        if (userId != null) {
            tryOnRequestRepository.findByUserIdAndSavedTrueOrderByUpdatedAtDesc(userId)
                    .forEach(request -> merged.putIfAbsent(request.getId(), request));
        }
        if (sessionId != null) {
            tryOnRequestRepository.findBySessionIdAndSavedTrueOrderByUpdatedAtDesc(sessionId)
                    .forEach(request -> merged.putIfAbsent(request.getId(), request));
        }
        return merged.values().stream()
                .sorted(Comparator.comparing(TryOnRequest::getUpdatedAt).reversed())
                .map(tryOn -> {
                    TryOnResponse response = toResponse(tryOn);
                    attachItemDetails(tryOn, response);
                    attachPreviewIfReady(tryOn, response);
                    return response;
                })
                .toList();
    }

    private void attachItemDetails(TryOnRequest tryOn, TryOnResponse response) {
        BodyProfile body = resolveBodyProfile(tryOn);
        StyleProfile style = styleProfileService.findProfileEntity().orElse(null);
        List<TryOnResponse.TryOnItemDto> enriched = new ArrayList<>();
        List<RecommendationResponse.OutfitItemDto> itemsForColor = new ArrayList<>();

        for (TryOnItem item : tryOnItemRepository.findByTryOnRequestId(tryOn.getId())) {
            Product product = productRepository.findById(item.getProductId()).orElse(null);
            if (product == null) {
                continue;
            }
            RecommendationResponse.OutfitItemDto composed =
                    outfitCompositionService.toProductItem(product, item.getRole(), body);
            String suggestedSize = composed.getSelectedSize();
            String selectedSize = item.getSelectedSize() != null ? item.getSelectedSize() : suggestedSize;
            String selectedColor = item.getSelectedColor() != null ? item.getSelectedColor() : composed.getSelectedColor();

            enriched.add(TryOnResponse.TryOnItemDto.builder()
                    .productId(product.getId())
                    .role(item.getRole())
                    .name(product.getName())
                    .category(product.getCategory())
                    .imageUrl(composed.getImageUrl())
                    .selectedSize(selectedSize)
                    .selectedColor(selectedColor)
                    .suggestedSize(suggestedSize)
                    .price(product.getPrice())
                    .canBuy(composed.isCanBuy())
                    .build());

            itemsForColor.add(RecommendationResponse.OutfitItemDto.builder()
                    .selectedSize(selectedSize)
                    .selectedColor(selectedColor)
                    .build());
        }

        response.setItems(enriched);

        if (!enriched.isEmpty()) {
            String primarySize = enriched.stream()
                    .map(TryOnResponse.TryOnItemDto::getSelectedSize)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElseGet(() -> enriched.getFirst().getSuggestedSize());
            if (primarySize == null) {
                primarySize = "M";
            }
            response.setRecommendedSize(primarySize);
            response.setAlternativeSize(sizeResolutionService.altSize(primarySize));
            response.setRecommendedForm(outfitCompositionService.recommendForm(body, style, tryOn.getOccasion()));
            String itemColor = enriched.stream()
                    .map(TryOnResponse.TryOnItemDto::getSelectedColor)
                    .filter(Objects::nonNull)
                    .filter(color -> !color.isBlank())
                    .findFirst()
                    .orElse(null);
            response.setRecommendedColor(itemColor != null
                    ? itemColor
                    : outfitCompositionService.recommendColor(style, itemsForColor));
        }
    }

    private BodyProfile resolveBodyProfile(TryOnRequest tryOn) {
        return bodyProfileService.findProfileEntity()
                .map(profile -> mergeTryOnIntoBody(profile, tryOn))
                .orElseGet(() -> bodyFromTryOn(tryOn));
    }

    private BodyProfile mergeTryOnIntoBody(BodyProfile profile, TryOnRequest tryOn) {
        if (tryOn.getHeightCm() != null) {
            profile.setHeightCm(tryOn.getHeightCm());
        }
        if (tryOn.getWeightKg() != null) {
            profile.setWeightKg(tryOn.getWeightKg());
        }
        if (tryOn.getPreferredFit() != null) {
            profile.setFitPreference(tryOn.getPreferredFit());
        }
        if (tryOn.getSkinTone() != null) {
            profile.setSkinTone(tryOn.getSkinTone());
        }
        return profile;
    }

    private BodyProfile bodyFromTryOn(TryOnRequest tryOn) {
        BodyProfile body = new BodyProfile();
        body.setHeightCm(tryOn.getHeightCm() != null ? tryOn.getHeightCm() : 165);
        body.setWeightKg(tryOn.getWeightKg() != null ? tryOn.getWeightKg() : java.math.BigDecimal.valueOf(55));
        if (tryOn.getPreferredFit() != null) {
            body.setFitPreference(tryOn.getPreferredFit());
        }
        if (tryOn.getSkinTone() != null) {
            body.setSkinTone(tryOn.getSkinTone());
        }
        return body;
    }

    private void attachOutfitCompletion(UUID tryOnRequestId, TryOnResponse response) {
        OutfitSuggestionsResponse completion = outfitCompletionService.analyzeTryOnRequest(tryOnRequestId);
        response.setOutfitComplete(completion.isOutfitComplete());
        response.setMissingRoles(completion.getMissingRoles());
        response.setImprovementSuggestions(completion.getImprovementSuggestions());
        response.setSuggestedItems(completion.getSuggestedItems());
    }

    private void attachPreviewIfReady(TryOnRequest tryOn, TryOnResponse response) {
        if (tryOn.getStatus() != TryOnStatus.COMPLETED && tryOn.getStatus() != TryOnStatus.FAILED) {
            return;
        }
        vtonTryOnService.findPreviewForTryOn(tryOn.getId()).ifPresent(preview -> {
            response.setPreviewImageUrl(preview.getPreviewImageUrl());
            response.setDisclaimer(preview.getDisclaimer());
            if (preview.getPreviewSource() != null) {
                response.setPreviewSource(preview.getPreviewSource().name());
            }
            if (preview.getErrorMessage() != null && !preview.getErrorMessage().isBlank()) {
                response.setErrorMessage(preview.getErrorMessage());
            }
        });
    }

    private void updateVariant(UUID tryOnId, VariantRequest request, String eventType) {
        TryOnRequest tryOn = getOwned(tryOnId);
        if (request.getProductId() != null) {
            tryOnItemRepository.findByTryOnRequestId(tryOnId).stream()
                    .filter(i -> i.getProductId().equals(request.getProductId()))
                    .findFirst()
                    .ifPresent(item -> {
                        if ("COLOR_COMPARED".equals(eventType)) {
                            item.setSelectedColor(request.getValue());
                        } else if ("SIZE_COMPARED".equals(eventType)) {
                            item.setSelectedSize(request.getValue());
                        }
                        tryOnItemRepository.save(item);
                    });
        }
        analyticsService.track(eventType, tryOn.getUserId(), tryOn.getSessionId(),
                null, request.getProductId(), null, tryOnId, null);
    }

    private TryOnRequest getOwned(UUID id) {
        TryOnRequest tryOn = tryOnRequestRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Try-on không tồn tại"));
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId != null && userId.equals(tryOn.getUserId())) return tryOn;
        if (sessionId != null && sessionId.equals(tryOn.getSessionId())) return tryOn;
        throw new BusinessException("Không có quyền truy cập try-on này");
    }

    private TryOnResponse toResponse(TryOnRequest tryOn) {
        TryOnPreviewMode mode = tryOn.getPreviewMode() != null
                ? tryOn.getPreviewMode()
                : TryOnPreviewMode.OUTFIT_BOARD_ONLY;
        return TryOnResponse.builder()
                .id(tryOn.getId())
                .status(tryOn.getStatus())
                .previewMode(mode)
                .previewType(toPreviewType(mode))
                .saved(tryOn.isSaved())
                .items(tryOnItemRepository.findByTryOnRequestId(tryOn.getId()).stream()
                        .map(i -> TryOnResponse.TryOnItemDto.builder()
                                .productId(i.getProductId())
                                .role(i.getRole())
                                .selectedSize(i.getSelectedSize())
                                .selectedColor(i.getSelectedColor())
                                .build())
                        .toList())
                .build();
    }

    private void validatePreviewMode(CreateTryOnRequest request, TryOnPreviewMode mode) {
        switch (mode) {
            case USER_PHOTO -> {
                if (request.getPhotoUploadId() == null) {
                    throw new BusinessException("Cần upload ảnh cá nhân cho chế độ này");
                }
                var upload = photoUploadService.getEntity(request.getPhotoUploadId());
                if (upload.getQualityStatus() != PhotoQualityStatus.GOOD) {
                    throw new BusinessException("Ảnh chưa đạt chất lượng. Vui lòng kiểm tra và upload lại");
                }
            }
            case AVATAR -> {
                if (!TryOnAvatarPresets.isValid(request.getAvatarKey())) {
                    throw new BusinessException("Cần chọn avatar mẫu hợp lệ");
                }
            }
            case OUTFIT_BOARD_ONLY -> {
                // No photo required
            }
        }
    }

    private static PreviewType toPreviewType(TryOnPreviewMode mode) {
        return switch (mode) {
            case USER_PHOTO -> PreviewType.USER_PHOTO_2D;
            case AVATAR -> PreviewType.AVATAR;
            case OUTFIT_BOARD_ONLY -> PreviewType.OUTFIT_BOARD;
        };
    }
}
