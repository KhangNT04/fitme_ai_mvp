package com.fitme.tryon.service;

import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.tryon.dto.OutfitSuggestionsResponse;
import com.fitme.tryon.entity.TryOnItem;
import com.fitme.tryon.repository.TryOnItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TryOnOutfitCompletionService {

    private final ProductRepository productRepository;
    private final ProductEligibilityService eligibilityService;
    private final OutfitCompositionService outfitCompositionService;
    private final BrandRepository brandRepository;
    private final TryOnItemRepository tryOnItemRepository;

    public OutfitSuggestionsResponse analyzeProductIds(List<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return OutfitSuggestionsResponse.builder()
                    .outfitComplete(false)
                    .missingRoles(List.of(ItemRole.TOP, ItemRole.BOTTOM))
                    .improvementSuggestions(List.of("Chọn ít nhất một sản phẩm để bắt đầu thử mặc."))
                    .suggestedItems(List.of())
                    .build();
        }

        List<Product> selected = productIds.stream()
                .map(productRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();

        Set<ItemRole> presentRoles = selected.stream()
                .map(p -> outfitCompositionService.guessRole(p.getCategory()))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return buildResponse(selected, presentRoles);
    }

    public OutfitSuggestionsResponse analyzeTryOnRequest(UUID tryOnRequestId) {
        List<TryOnItem> items = tryOnItemRepository.findByTryOnRequestId(tryOnRequestId);
        List<UUID> productIds = items.stream().map(TryOnItem::getProductId).toList();
        Set<ItemRole> presentRoles = items.stream()
                .map(TryOnItem::getRole)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<Product> selected = productIds.stream()
                .map(productRepository::findById)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();

        return buildResponse(selected, presentRoles);
    }

    public boolean isOutfitComplete(Collection<ItemRole> presentRoles) {
        return missingCoreRoles(presentRoles).isEmpty();
    }

    public String resolvePreviewImageUrl(UUID tryOnRequestId) {
        List<TryOnItem> items = tryOnItemRepository.findByTryOnRequestId(tryOnRequestId);
        for (TryOnItem item : items) {
            String url = outfitCompositionService.resolveProductImageUrl(item.getProductId());
            if (url != null && !url.isBlank()) {
                return url;
            }
        }
        return null;
    }

    private OutfitSuggestionsResponse buildResponse(List<Product> selected, Set<ItemRole> presentRoles) {
        List<ItemRole> missing = missingCoreRoles(presentRoles);
        boolean complete = missing.isEmpty();

        List<String> suggestions = new ArrayList<>();
        if (complete) {
            suggestions.add("Set cơ bản đã đủ — bạn có thể thêm giày hoặc phụ kiện để hoàn thiện hơn.");
        } else {
            suggestions.add("Preview sẽ ghép từ item bạn đã chọn. Bổ sung thêm để hoàn thiện set:");
            for (ItemRole role : missing) {
                suggestions.add("• " + roleLabel(role));
            }
        }

        List<OutfitSuggestionsResponse.SuggestedOutfitItemDto> suggested = complete
                ? suggestOptionalItems(selected, presentRoles)
                : suggestMissingItems(selected, missing);

        return OutfitSuggestionsResponse.builder()
                .outfitComplete(complete)
                .missingRoles(missing)
                .improvementSuggestions(suggestions)
                .suggestedItems(suggested)
                .build();
    }

    private List<ItemRole> missingCoreRoles(Collection<ItemRole> presentRoles) {
        boolean hasTop = presentRoles.contains(ItemRole.TOP) || presentRoles.contains(ItemRole.ONE_PIECE);
        boolean hasBottom = presentRoles.contains(ItemRole.BOTTOM) || presentRoles.contains(ItemRole.ONE_PIECE);

        List<ItemRole> missing = new ArrayList<>();
        if (!hasTop) {
            missing.add(ItemRole.TOP);
        }
        if (!hasBottom) {
            missing.add(ItemRole.BOTTOM);
        }
        return missing;
    }

    private List<OutfitSuggestionsResponse.SuggestedOutfitItemDto> suggestMissingItems(
            List<Product> selected, List<ItemRole> missingRoles) {
        if (missingRoles.isEmpty()) {
            return List.of();
        }

        UUID preferredBrandId = selected.isEmpty() ? null : selected.getFirst().getBrandId();
        Set<UUID> usedIds = selected.stream().map(Product::getId).collect(Collectors.toSet());
        List<Product> eligible = loadEligibleProducts();

        List<OutfitSuggestionsResponse.SuggestedOutfitItemDto> suggestions = new ArrayList<>();
        for (ItemRole role : missingRoles) {
            findProductForRole(eligible, role, preferredBrandId, usedIds)
                    .ifPresent(product -> {
                        usedIds.add(product.getId());
                        suggestions.add(toSuggestedItem(product, role,
                                "Gợi ý " + roleLabel(role).toLowerCase() + " phù hợp với item đã chọn"));
                    });
        }
        return suggestions;
    }

    private List<OutfitSuggestionsResponse.SuggestedOutfitItemDto> suggestOptionalItems(
            List<Product> selected, Set<ItemRole> presentRoles) {
        if (presentRoles.contains(ItemRole.SHOES)) {
            return List.of();
        }

        UUID preferredBrandId = selected.isEmpty() ? null : selected.getFirst().getBrandId();
        Set<UUID> usedIds = selected.stream().map(Product::getId).collect(Collectors.toSet());
        List<Product> eligible = loadEligibleProducts();

        return findProductForRole(eligible, ItemRole.SHOES, preferredBrandId, usedIds)
                .map(product -> List.of(toSuggestedItem(product, ItemRole.SHOES,
                        "Thêm giày để set trông hoàn chỉnh hơn")))
                .orElse(List.of());
    }

    private Optional<Product> findProductForRole(List<Product> eligible, ItemRole role,
            UUID preferredBrandId, Set<UUID> usedIds) {
        Optional<Product> sameBrand = eligible.stream()
                .filter(p -> !usedIds.contains(p.getId()))
                .filter(p -> preferredBrandId != null && preferredBrandId.equals(p.getBrandId()))
                .filter(p -> outfitCompositionService.guessRole(p.getCategory()) == role)
                .findFirst();
        if (sameBrand.isPresent()) {
            return sameBrand;
        }
        return eligible.stream()
                .filter(p -> !usedIds.contains(p.getId()))
                .filter(p -> outfitCompositionService.guessRole(p.getCategory()) == role)
                .findFirst();
    }

    private List<Product> loadEligibleProducts() {
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(p -> brandRepository.findById(p.getBrandId())
                        .map(b -> b.getStatus() == BrandStatus.APPROVED)
                        .orElse(false))
                .filter(eligibilityService::canBeUsedForAiTryOn)
                .toList();
    }

    private OutfitSuggestionsResponse.SuggestedOutfitItemDto toSuggestedItem(
            Product product, ItemRole role, String reason) {
        return OutfitSuggestionsResponse.SuggestedOutfitItemDto.builder()
                .productId(product.getId())
                .role(role)
                .name(product.getName())
                .category(product.getCategory())
                .imageUrl(outfitCompositionService.resolveProductImageUrl(product.getId()))
                .reason(reason)
                .build();
    }

    private static String roleLabel(ItemRole role) {
        return switch (role) {
            case TOP -> "Áo / top";
            case BOTTOM -> "Quần / váy";
            case OUTERWEAR -> "Áo khoác";
            case SHOES -> "Giày";
            case ACCESSORY -> "Phụ kiện";
            case ONE_PIECE -> "Váy liền";
        };
    }
}
