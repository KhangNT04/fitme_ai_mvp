package com.fitme.tryon.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.billing.service.BrandQuotaService;
import com.fitme.common.enums.TryOnStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.service.VtonTryOnService;
import com.fitme.tryon.dto.*;
import com.fitme.billing.service.BrandQuotaService;
import com.fitme.product.repository.ProductRepository;
import com.fitme.tryon.entity.TryOnItem;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnItemRepository;
import com.fitme.tryon.repository.TryOnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public TryOnResponse create(CreateTryOnRequest request) {
        TryOnRequest entity = TryOnRequest.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .photoUploadId(request.getPhotoUploadId())
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
        TryOnResponse response = toResponse(getOwned(id));
        attachPreviewIfReady(getOwned(id), response);
        return response;
    }

    @Transactional
    public TryOnResponse addItem(UUID id, AddTryOnItemRequest request) {
        TryOnRequest tryOn = getOwned(id);
        tryOnItemRepository.save(TryOnItem.builder()
                .tryOnRequestId(id)
                .productId(request.getProductId())
                .role(request.getRole())
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
        attachPreviewIfReady(tryOn, response);
        return response;
    }

    public TryOnResponse getResult(UUID id) {
        TryOnRequest tryOn = getOwned(id);
        TryOnResponse response = toResponse(tryOn);
        attachPreviewIfReady(tryOn, response);
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
        analyticsService.track("OUTFIT_SAVED", RequestContext.getCurrentUserId().orElse(null),
                RequestContext.getSessionId().orElse(null), null, null, null, id, null);
    }

    private void attachPreviewIfReady(TryOnRequest tryOn, TryOnResponse response) {
        if (tryOn.getStatus() != TryOnStatus.COMPLETED && tryOn.getStatus() != TryOnStatus.FAILED) {
            return;
        }
        vtonTryOnService.findPreviewForTryOn(tryOn.getId()).ifPresent(preview -> {
            response.setPreviewImageUrl(preview.getPreviewImageUrl());
            response.setDisclaimer(preview.getDisclaimer());
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
        return TryOnResponse.builder()
                .id(tryOn.getId())
                .status(tryOn.getStatus())
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
}
