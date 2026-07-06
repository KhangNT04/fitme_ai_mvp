package com.fitme.ai;

import com.fitme.ai.dto.GeminiOutfitSuggestion;
import com.fitme.common.enums.Confidence;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.SourceType;
import com.fitme.product.entity.Product;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.recommendation.service.SizeResolutionService;
import com.fitme.userprofile.entity.BodyProfile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class GeminiOutfitValidator {

    private static final Set<ItemRole> ALLOWED_ROLES = EnumSet.of(
            ItemRole.TOP, ItemRole.BOTTOM, ItemRole.ONE_PIECE, ItemRole.OUTERWEAR, ItemRole.SHOES);

    private final OutfitCompositionService outfitCompositionService;
    private final SizeResolutionService sizeResolutionService;
    private final ProductEligibilityService eligibilityService;
    private final ProductAudienceService productAudienceService;

    public GeminiOutfitValidator(
            OutfitCompositionService outfitCompositionService,
            SizeResolutionService sizeResolutionService,
            ProductEligibilityService eligibilityService,
            ProductAudienceService productAudienceService) {
        this.outfitCompositionService = outfitCompositionService;
        this.sizeResolutionService = sizeResolutionService;
        this.eligibilityService = eligibilityService;
        this.productAudienceService = productAudienceService;
    }

    public List<RecommendationResponse.OutfitItemDto> validateAndMap(
            GeminiOutfitSuggestion suggestion,
            List<Product> candidates,
            BodyProfile body) {
        if (suggestion.getItems() == null || suggestion.getItems().isEmpty()) {
            throw new IllegalArgumentException("Gemini returned no items");
        }

        Map<UUID, Product> candidateById = candidates.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a));

        List<RecommendationResponse.OutfitItemDto> items = new ArrayList<>();
        Set<ItemRole> usedRoles = EnumSet.noneOf(ItemRole.class);

        for (GeminiOutfitSuggestion.Item raw : suggestion.getItems()) {
            if (raw.getProductId() == null || raw.getProductId().isBlank()) {
                throw new IllegalArgumentException("Missing productId");
            }
            UUID productId = UUID.fromString(raw.getProductId());
            Product product = candidateById.get(productId);
            if (product == null) {
                throw new IllegalArgumentException("Product not in candidate set: " + productId);
            }
            if (!productAudienceService.isRecommendableFor(body, product)) {
                throw new IllegalArgumentException("Product not suitable for user gender: " + productId);
            }
            ItemRole role = parseRole(raw.getRole());
            if (!ALLOWED_ROLES.contains(role)) {
                throw new IllegalArgumentException("Unsupported role: " + raw.getRole());
            }
            if (role == ItemRole.ONE_PIECE) {
                usedRoles.remove(ItemRole.TOP);
                usedRoles.remove(ItemRole.BOTTOM);
            } else if (usedRoles.contains(role)) {
                throw new IllegalArgumentException("Duplicate role: " + role);
            }
            if (usedRoles.contains(ItemRole.ONE_PIECE) && (role == ItemRole.TOP || role == ItemRole.BOTTOM)) {
                throw new IllegalArgumentException("Cannot mix ONE_PIECE with top/bottom");
            }
            usedRoles.add(role);

            RecommendationResponse.OutfitItemDto dto = outfitCompositionService.toProductItem(product, role, body);
            if (raw.getSelectedSize() != null && !raw.getSelectedSize().isBlank()) {
                dto.setSelectedSize(raw.getSelectedSize());
            } else if (dto.getSelectedSize() == null || dto.getSelectedSize().isBlank()) {
                dto.setSelectedSize(sizeResolutionService.resolveSize(body, productId));
            }
            if (raw.getSelectedColor() != null && !raw.getSelectedColor().isBlank()) {
                dto.setSelectedColor(raw.getSelectedColor());
            }
            dto.setCanBuy(eligibilityService.canShowBuyButton(product));
            dto.setSourceType(SourceType.BRAND_PRODUCT);
            items.add(dto);
        }

        if (items.isEmpty()) {
            throw new IllegalArgumentException("No valid items after validation");
        }
        return items;
    }

    public static Confidence parseConfidence(String raw) {
        if (raw == null) {
            return Confidence.MEDIUM;
        }
        try {
            return Confidence.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return Confidence.MEDIUM;
        }
    }

    private static ItemRole parseRole(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Missing role");
        }
        return ItemRole.valueOf(raw.trim().toUpperCase());
    }
}
