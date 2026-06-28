package com.fitme.recommendation.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.Confidence;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.RecommendationStatus;
import com.fitme.common.enums.SourceType;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.OwnershipChecker;
import com.fitme.common.security.RequestContext;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.entity.OutfitRequest;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.recommendation.entity.RecommendationItem;
import com.fitme.recommendation.repository.OutfitRequestRepository;
import com.fitme.recommendation.repository.RecommendationItemRepository;
import com.fitme.recommendation.repository.RecommendationRepository;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.service.BodyProfileService;
import com.fitme.userprofile.service.StyleProfileService;
import com.fitme.wardrobe.entity.WardrobeItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final OutfitRequestRepository outfitRequestRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationItemRepository recommendationItemRepository;
    private final ProductRepository productRepository;
    private final ProductEligibilityService eligibilityService;
    private final BodyProfileService bodyProfileService;
    private final StyleProfileService styleProfileService;
    private final AnalyticsService analyticsService;
    private final WardrobeBlendService wardrobeBlendService;
    private final OutfitScoringService outfitScoringService;
    private final OutfitCompositionService outfitCompositionService;
    private final SizeResolutionService sizeResolutionService;

    @Transactional
    public RecommendationResponse generate(CreateRecommendationRequest request) {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = request.getSessionId() != null ? request.getSessionId()
                : RequestContext.getSessionId().orElse(null);
        if (userId == null && sessionId == null) {
            throw new BusinessException("Yêu cầu đăng nhập hoặc session ẩn danh");
        }

        BodyProfile body = bodyProfileService.findProfileEntity()
                .orElseThrow(() -> new BusinessException("Vui lòng cập nhật body profile trước"));
        StyleProfile style = styleProfileService.findProfileEntity()
                .orElseThrow(() -> new BusinessException("Vui lòng cập nhật style profile trước"));

        String occasion = request.getOccasion() != null && !request.getOccasion().isBlank()
                ? request.getOccasion() : "Casual hàng ngày";
        WardrobeMode mode = request.getWardrobeMode() != null ? request.getWardrobeMode() : WardrobeMode.NO_WARDROBE_DATA;

        OutfitRequest outfitRequest = OutfitRequest.builder()
                .userId(userId)
                .sessionId(sessionId)
                .selectedProductId(request.getSelectedProductId())
                .occasion(occasion)
                .desiredVibe(request.getDesiredVibe())
                .wardrobeMode(mode)
                .budgetMin(request.getBudgetMin())
                .budgetMax(request.getBudgetMax())
                .build();
        outfitRequest = outfitRequestRepository.save(outfitRequest);

        List<WardrobeItem> wardrobe = wardrobeBlendService.loadWardrobe(userId, sessionId, mode);
        List<Product> eligible = productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(eligibilityService::canBeRecommended)
                .filter(p -> outfitScoringService.withinBudget(p, request.getBudgetMin(), request.getBudgetMax()))
                .sorted((a, b) -> Double.compare(
                        outfitScoringService.scoreProduct(b, style, occasion, body),
                        outfitScoringService.scoreProduct(a, style, occasion, body)))
                .toList();

        Product anchor = request.getSelectedProductId() != null
                ? productRepository.findById(request.getSelectedProductId()).orElse(null) : null;

        List<RecommendationResponse.OutfitItemDto> items = outfitCompositionService.buildOutfit(
                anchor, eligible, wardrobe, mode, body, style);
        String recommendedSize = anchor != null
                ? sizeResolutionService.resolveSize(body, anchor.getId())
                : sizeResolutionService.recommendSize(body, items);
        String altSize = sizeResolutionService.altSize(recommendedSize);
        String recommendedForm = outfitCompositionService.recommendForm(body, style, occasion);
        String recommendedColor = outfitCompositionService.recommendColor(style, items);
        Confidence confidence = items.size() >= 3 ? Confidence.HIGH : items.size() >= 2 ? Confidence.MEDIUM : Confidence.LOW;

        String title = "Outfit " + occasion + " phong cách " + style.getPrimaryStyle();
        Recommendation rec = Recommendation.builder()
                .outfitRequestId(outfitRequest.getId())
                .userId(userId)
                .sessionId(sessionId)
                .title(title)
                .recommendedSize(recommendedSize)
                .alternativeSize(altSize)
                .recommendedForm(recommendedForm)
                .recommendedColor(recommendedColor)
                .confidence(confidence)
                .explanationBody("Form " + recommendedForm.toLowerCase() + " giúp tổng thể thoải mái và phù hợp với số đo của bạn.")
                .explanationStyle("Phù hợp với gu " + style.getPrimaryStyle() + " bạn đã chọn.")
                .explanationOccasion("Phù hợp cho " + occasion + " vì nhẹ nhàng và dễ phối.")
                .explanationColor("Màu " + recommendedColor + " tạo cảm giác hài hòa và dễ mix-match.")
                .explanationWardrobe(wardrobe.isEmpty() ? null : "Đã tận dụng " + wardrobe.size() + " món từ tủ đồ của bạn.")
                .status(RecommendationStatus.GENERATED.name())
                .build();
        rec = recommendationRepository.save(rec);

        int sort = 0;
        for (RecommendationResponse.OutfitItemDto item : items) {
            recommendationItemRepository.save(RecommendationItem.builder()
                    .recommendationId(rec.getId())
                    .productId(item.getProductId())
                    .wardrobeItemId(item.getWardrobeItemId())
                    .role(item.getRole())
                    .sourceType(item.getSourceType())
                    .displayName(item.getDisplayName())
                    .selectedSize(item.getSelectedSize())
                    .selectedColor(item.getSelectedColor())
                    .price(item.getPrice())
                    .sortOrder(sort++)
                    .build());
        }

        analyticsService.track("RECOMMENDATION_GENERATED", userId, sessionId, null, null, rec.getId(), null, null);

        return outfitCompositionService.toResponse(rec, items);
    }

    public RecommendationResponse getById(UUID id) {
        Recommendation rec = getOwnedRecommendation(id);
        List<RecommendationResponse.OutfitItemDto> items = recommendationItemRepository
                .findByRecommendationIdOrderBySortOrderAsc(id).stream()
                .map(outfitCompositionService::toOutfitItem)
                .toList();
        return outfitCompositionService.toResponse(rec, items);
    }

    @Transactional
    public void save(UUID id) {
        Recommendation rec = getOwnedRecommendation(id);
        rec.setSaved(true);
        recommendationRepository.save(rec);
        analyticsService.track("OUTFIT_SAVED", rec.getUserId(), rec.getSessionId(), null, null, id, null, null);
    }

    public List<RecommendationResponse> getSaved() {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        List<Recommendation> saved;
        if (userId != null) {
            saved = recommendationRepository.findByUserIdAndSavedTrue(userId);
        } else if (sessionId != null) {
            saved = recommendationRepository.findBySessionIdAndSavedTrue(sessionId);
        } else {
            throw new BusinessException("Yêu cầu đăng nhập hoặc session ẩn danh");
        }
        return saved.stream().map(r -> getById(r.getId())).toList();
    }

    public List<RecommendationResponse.OutfitItemDto> similarProducts(UUID id) {
        getOwnedRecommendation(id);
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(eligibilityService::canBeRecommended)
                .limit(6)
                .map(p -> RecommendationResponse.OutfitItemDto.builder()
                        .productId(p.getId())
                        .role(outfitCompositionService.guessRole(p.getCategory()))
                        .sourceType(SourceType.BRAND_PRODUCT)
                        .displayName(p.getName())
                        .price(p.getPrice())
                        .canBuy(eligibilityService.canShowBuyButton(p))
                        .build())
                .toList();
    }

    private Recommendation getOwnedRecommendation(UUID id) {
        Recommendation rec = recommendationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
        OwnershipChecker.verify(rec.getUserId(), rec.getSessionId());
        return rec;
    }
}
