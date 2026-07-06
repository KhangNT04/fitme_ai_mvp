package com.fitme.ai;

import com.fitme.common.enums.ItemRole;
import com.fitme.product.repository.ProductRepository;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.storage.MediaUrlResolver;
import com.fitme.tryon.entity.TryOnItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class VtonCategoryMapper {

    private static final List<ItemRole> PRIORITY = List.of(
            ItemRole.ONE_PIECE,
            ItemRole.TOP,
            ItemRole.BOTTOM,
            ItemRole.OUTERWEAR
    );

    private final ProductRepository productRepository;
    private final OutfitCompositionService outfitCompositionService;
    private final MediaUrlResolver mediaUrlResolver;

    public Optional<GarmentSelection> selectGarment(List<TryOnItem> items) {
        return items.stream()
                .filter(item -> isSupportedRole(item.getRole()))
                .sorted(Comparator.comparingInt(item -> PRIORITY.indexOf(item.getRole())))
                .map(this::toSelection)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst();
    }

    private Optional<GarmentSelection> toSelection(TryOnItem item) {
        String category = toVtonCategory(item.getRole());
        if (category == null) {
            return Optional.empty();
        }
        String imageUrl = mediaUrlResolver.resolvePublicUrl(
                outfitCompositionService.resolveTryOnImageUrl(item.getProductId()));
        if (imageUrl == null || imageUrl.isBlank()) {
            return Optional.empty();
        }
        String productName = productRepository.findById(item.getProductId())
                .map(p -> p.getName())
                .orElse("garment");
        return Optional.of(new GarmentSelection(category, imageUrl, productName));
    }

    public static boolean isSupportedRole(ItemRole role) {
        return role == ItemRole.TOP
                || role == ItemRole.BOTTOM
                || role == ItemRole.ONE_PIECE
                || role == ItemRole.OUTERWEAR;
    }

    public static String toVtonCategory(ItemRole role) {
        if (role == null) {
            return null;
        }
        return switch (role) {
            case TOP, OUTERWEAR -> "tops";
            case BOTTOM -> "bottoms";
            case ONE_PIECE -> "one-pieces";
            default -> null;
        };
    }

    public record GarmentSelection(String category, String garmentImageUrl, String productName) {
    }
}
