package com.fitme.recommendation.service;

import com.fitme.common.constants.FitMeConstants;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.SourceType;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.recommendation.entity.RecommendationItem;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.wardrobe.entity.WardrobeItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class OutfitCompositionService {

    private final ProductVariantRepository variantRepository;
    private final ProductEligibilityService eligibilityService;
    private final SizeResolutionService sizeResolutionService;

    public List<RecommendationResponse.OutfitItemDto> buildOutfit(Product anchor, List<Product> eligible,
            List<WardrobeItem> wardrobe, WardrobeMode mode, BodyProfile body, StyleProfile style) {
        List<RecommendationResponse.OutfitItemDto> items = new ArrayList<>();
        Set<UUID> usedProducts = new HashSet<>();

        if (anchor != null && eligibilityService.canBeRecommended(anchor)) {
            items.add(toProductItem(anchor, guessRole(anchor.getCategory()), body));
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
            items.add(toProductItem(e.getValue(), e.getKey(), body));
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

    public RecommendationResponse.OutfitItemDto toProductItem(Product p, ItemRole role, BodyProfile body) {
        List<ProductVariant> variants = variantRepository.findByProductId(p.getId());
        String color = variants.stream().map(ProductVariant::getColorName).filter(Objects::nonNull).findFirst().orElse("Đen");
        String size = sizeResolutionService.resolveSize(body, p.getId());
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

    public ItemRole guessRole(String category) {
        if (category == null) return ItemRole.TOP;
        String c = category.toLowerCase();
        if (c.contains("quần") || c.contains("bottom") || c.contains("chân")) return ItemRole.BOTTOM;
        if (c.contains("giày") || c.contains("shoe")) return ItemRole.SHOES;
        if (c.contains("áo khoác") || c.contains("outer")) return ItemRole.OUTERWEAR;
        if (c.contains("váy") || c.contains("dress") || c.contains("one")) return ItemRole.ONE_PIECE;
        if (c.contains("phụ kiện") || c.contains("access")) return ItemRole.ACCESSORY;
        return ItemRole.TOP;
    }

    public String recommendForm(BodyProfile body, StyleProfile style, String occasion) {
        if (body.getFitPreference() != null) {
            return body.getFitPreference().name().charAt(0) + body.getFitPreference().name().substring(1).toLowerCase();
        }
        return "Regular";
    }

    public String recommendColor(StyleProfile style, List<RecommendationResponse.OutfitItemDto> items) {
        if (style.getPreferredColors() != null && !style.getPreferredColors().isEmpty()) {
            return style.getPreferredColors().get(0);
        }
        return items.stream().map(RecommendationResponse.OutfitItemDto::getSelectedColor)
                .filter(Objects::nonNull).findFirst().orElse("Navy");
    }

    public RecommendationResponse.OutfitItemDto toOutfitItem(RecommendationItem item) {
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

    public RecommendationResponse toResponse(Recommendation rec, List<RecommendationResponse.OutfitItemDto> items) {
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
