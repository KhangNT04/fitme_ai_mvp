package com.fitme.recommendation.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.constants.FitMeConstants;
import com.fitme.common.enums.Confidence;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.RecommendationStatus;
import com.fitme.common.enums.SourceType;
import com.fitme.common.enums.StockStatus;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
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
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final OutfitRequestRepository outfitRequestRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationItemRepository recommendationItemRepository;
    private final ProductRepository productRepository;
    private final ProductTagRepository tagRepository;
    private final ProductVariantRepository variantRepository;
    private final SizeChartRepository sizeChartRepository;
    private final WardrobeItemRepository wardrobeItemRepository;
    private final ProductEligibilityService eligibilityService;
    private final BodyProfileService bodyProfileService;
    private final StyleProfileService styleProfileService;
    private final AnalyticsService analyticsService;

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

        List<WardrobeItem> wardrobe = loadWardrobe(userId, sessionId, mode);
        List<Product> eligible = productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(eligibilityService::canBeRecommended)
                .filter(p -> withinBudget(p, request.getBudgetMin(), request.getBudgetMax()))
                .sorted((a, b) -> Double.compare(scoreProduct(b, style, occasion, body), scoreProduct(a, style, occasion, body)))
                .toList();

        Product anchor = request.getSelectedProductId() != null
                ? productRepository.findById(request.getSelectedProductId()).orElse(null) : null;

        List<RecommendationResponse.OutfitItemDto> items = buildOutfit(anchor, eligible, wardrobe, mode, body, style);
        String recommendedSize = recommendSize(body, items);
        String altSize = altSize(recommendedSize);
        String recommendedForm = recommendForm(body, style, occasion);
        String recommendedColor = recommendColor(style, items);
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

        return toResponse(rec, items);
    }

    public RecommendationResponse getById(UUID id) {
        Recommendation rec = recommendationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
        List<RecommendationResponse.OutfitItemDto> items = recommendationItemRepository
                .findByRecommendationIdOrderBySortOrderAsc(id).stream()
                .map(this::toOutfitItem)
                .toList();
        return toResponse(rec, items);
    }

    @Transactional
    public void save(UUID id) {
        Recommendation rec = recommendationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
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
        Recommendation rec = recommendationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(eligibilityService::canBeRecommended)
                .limit(6)
                .map(p -> RecommendationResponse.OutfitItemDto.builder()
                        .productId(p.getId())
                        .role(guessRole(p.getCategory()))
                        .sourceType(SourceType.BRAND_PRODUCT)
                        .displayName(p.getName())
                        .price(p.getPrice())
                        .canBuy(eligibilityService.canShowBuyButton(p))
                        .build())
                .toList();
    }

    private List<WardrobeItem> loadWardrobe(UUID userId, UUID sessionId, WardrobeMode mode) {
        if (mode == WardrobeMode.NEW_ITEMS_ONLY || mode == WardrobeMode.NO_WARDROBE_DATA) {
            return List.of();
        }
        if (userId != null) {
            return wardrobeItemRepository.findByUserId(userId);
        }
        if (sessionId != null) {
            return wardrobeItemRepository.findBySessionId(sessionId);
        }
        return List.of();
    }

    private double scoreProduct(Product p, StyleProfile style, String occasion, BodyProfile body) {
        double score = 0;
        List<ProductTag> tags = tagRepository.findByProductId(p.getId());
        for (ProductTag tag : tags) {
            if ("STYLE".equals(tag.getTagType()) && tag.getTagValue().equalsIgnoreCase(style.getPrimaryStyle())) {
                score += 30;
            }
            if ("OCCASION".equals(tag.getTagType()) && occasion.toLowerCase().contains(tag.getTagValue().toLowerCase())) {
                score += 25;
            }
        }
        if (p.getFitType() == body.getFitPreference()) score += 15;
        if (p.getStockStatus() == StockStatus.IN_STOCK) score += 10;
        if (p.isSponsored()) score += 5;
        return score;
    }

    private boolean withinBudget(Product p, BigDecimal min, BigDecimal max) {
        if (p.getPrice() == null) return true;
        if (min != null && p.getPrice().compareTo(min) < 0) return false;
        if (max != null && p.getPrice().compareTo(max) > 0) return false;
        return true;
    }

    private List<RecommendationResponse.OutfitItemDto> buildOutfit(Product anchor, List<Product> eligible,
            List<WardrobeItem> wardrobe, WardrobeMode mode, BodyProfile body, StyleProfile style) {
        List<RecommendationResponse.OutfitItemDto> items = new ArrayList<>();
        Set<UUID> usedProducts = new HashSet<>();

        if (anchor != null && eligibilityService.canBeRecommended(anchor)) {
            items.add(toProductItem(anchor, guessRole(anchor.getCategory())));
            usedProducts.add(anchor.getId());
        }

        Map<ItemRole, Product> byRole = new EnumMap<>(ItemRole.class);
        for (Product p : eligible) {
            if (usedProducts.contains(p.getId())) continue;
            ItemRole role = guessRole(p.getCategory());
            byRole.putIfAbsent(role, p);
        }

        if (!byRole.containsKey(ItemRole.TOP) && !byRole.containsKey(ItemRole.ONE_PIECE)) {
            eligible.stream().filter(p -> !usedProducts.contains(p.getId())).findFirst()
                    .ifPresent(p -> byRole.put(ItemRole.TOP, p));
        }
        if (!byRole.containsKey(ItemRole.BOTTOM)) {
            eligible.stream().filter(p -> !usedProducts.contains(p.getId()) && guessRole(p.getCategory()) == ItemRole.BOTTOM)
                    .findFirst().ifPresent(p -> byRole.put(ItemRole.BOTTOM, p));
        }
        if (!byRole.containsKey(ItemRole.SHOES)) {
            eligible.stream().filter(p -> !usedProducts.contains(p.getId()) && guessRole(p.getCategory()) == ItemRole.SHOES)
                    .findFirst().ifPresent(p -> byRole.put(ItemRole.SHOES, p));
        }

        for (Map.Entry<ItemRole, Product> e : byRole.entrySet()) {
            items.add(toProductItem(e.getValue(), e.getKey()));
        }

        if (mode != WardrobeMode.NEW_ITEMS_ONLY && !wardrobe.isEmpty()) {
            WardrobeItem w = wardrobe.get(0);
            items.add(0, RecommendationResponse.OutfitItemDto.builder()
                    .wardrobeItemId(w.getId())
                    .role(guessRole(w.getCategory()))
                    .sourceType(SourceType.USER_WARDROBE)
                    .displayName(w.getName())
                    .selectedColor(w.getColor())
                    .canBuy(false)
                    .build());
        }
        return items;
    }

    private RecommendationResponse.OutfitItemDto toProductItem(Product p, ItemRole role) {
        List<ProductVariant> variants = variantRepository.findByProductId(p.getId());
        String color = variants.stream().map(ProductVariant::getColorName).filter(Objects::nonNull).findFirst().orElse("Đen");
        String size = variants.stream().map(ProductVariant::getSizeLabel).filter(Objects::nonNull).findFirst().orElse("M");
        return RecommendationResponse.OutfitItemDto.builder()
                .productId(p.getId())
                .role(role)
                .sourceType(SourceType.BRAND_PRODUCT)
                .displayName(p.getName())
                .selectedSize(size)
                .selectedColor(color)
                .price(p.getPrice())
                .canBuy(eligibilityService.canShowBuyButton(p))
                .build();
    }

    private ItemRole guessRole(String category) {
        if (category == null) return ItemRole.TOP;
        String c = category.toLowerCase();
        if (c.contains("quần") || c.contains("bottom") || c.contains("chân")) return ItemRole.BOTTOM;
        if (c.contains("giày") || c.contains("shoe")) return ItemRole.SHOES;
        if (c.contains("áo khoác") || c.contains("outer")) return ItemRole.OUTERWEAR;
        if (c.contains("váy") || c.contains("dress") || c.contains("one")) return ItemRole.ONE_PIECE;
        if (c.contains("phụ kiện") || c.contains("access")) return ItemRole.ACCESSORY;
        return ItemRole.TOP;
    }

    private String recommendSize(BodyProfile body, List<RecommendationResponse.OutfitItemDto> items) {
        if (body.getHeightCm() != null && body.getHeightCm() < 160) return "S";
        if (body.getHeightCm() != null && body.getHeightCm() > 175) return "L";
        return "M";
    }

    private String altSize(String size) {
        return switch (size) {
            case "S" -> "M";
            case "L" -> "M";
            default -> "L";
        };
    }

    private String recommendForm(BodyProfile body, StyleProfile style, String occasion) {
        if (body.getFitPreference() != null) {
            return body.getFitPreference().name().charAt(0) + body.getFitPreference().name().substring(1).toLowerCase();
        }
        return "Regular";
    }

    private String recommendColor(StyleProfile style, List<RecommendationResponse.OutfitItemDto> items) {
        if (style.getPreferredColors() != null && !style.getPreferredColors().isEmpty()) {
            return style.getPreferredColors().get(0);
        }
        return items.stream().map(RecommendationResponse.OutfitItemDto::getSelectedColor)
                .filter(Objects::nonNull).findFirst().orElse("Navy");
    }

    private RecommendationResponse.OutfitItemDto toOutfitItem(RecommendationItem item) {
        boolean canBuy = item.getSourceType() == SourceType.BRAND_PRODUCT && item.getProductId() != null;
        return RecommendationResponse.OutfitItemDto.builder()
                .productId(item.getProductId())
                .wardrobeItemId(item.getWardrobeItemId())
                .role(item.getRole())
                .sourceType(item.getSourceType())
                .displayName(item.getDisplayName())
                .selectedSize(item.getSelectedSize())
                .selectedColor(item.getSelectedColor())
                .price(item.getPrice())
                .canBuy(canBuy)
                .build();
    }

    private RecommendationResponse toResponse(Recommendation rec, List<RecommendationResponse.OutfitItemDto> items) {
        return RecommendationResponse.builder()
                .recommendationId(rec.getId())
                .title(rec.getTitle())
                .recommendedSize(rec.getRecommendedSize())
                .alternativeSize(rec.getAlternativeSize())
                .recommendedForm(rec.getRecommendedForm())
                .recommendedColor(rec.getRecommendedColor())
                .confidence(rec.getConfidence())
                .outfitItems(items)
                .explanation(RecommendationResponse.ExplanationDto.builder()
                        .bodyFit(rec.getExplanationBody())
                        .styleFit(rec.getExplanationStyle())
                        .occasionFit(rec.getExplanationOccasion())
                        .colorFit(rec.getExplanationColor())
                        .wardrobeFit(rec.getExplanationWardrobe())
                        .build())
                .preview(RecommendationResponse.PreviewDto.builder()
                        .type("OUTFIT_BOARD")
                        .imageUrl(null)
                        .disclaimer(FitMeConstants.AI_DISCLAIMER_SHORT)
                        .build())
                .build();
    }
}
