package com.fitme.ai;

import com.fitme.common.enums.ItemRole;
import com.fitme.product.repository.ProductRepository;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.storage.MediaUrlResolver;
import com.fitme.tryon.entity.TryOnItem;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class VtonCategoryMapper {

    private final ProductRepository productRepository;
    private final OutfitCompositionService outfitCompositionService;
    private final MediaUrlResolver mediaUrlResolver;

    /**
     * Selects the garment(s) to render for a try-on request, in call order.
     *
     * <p>FASHN (and every other VTON provider wired in ai-vton) only accepts one
     * garment per prediction, so a full outfit is rendered as a <b>sequence</b> of
     * calls, each one applied on top of the previous step's output image:
     * ONE_PIECE alone (it already covers the full body), otherwise an upper
     * garment (TOP, falling back to OUTERWEAR) followed by BOTTOM. SHOES and
     * ACCESSORY are not supported by the current VTON category mapping and are
     * skipped — see docs/FASHN_VTON_INTEGRATION.md §2.
     */
    public List<GarmentSelection> selectGarments(List<TryOnItem> items) {
        Optional<TryOnItem> onePiece = findByRole(items, ItemRole.ONE_PIECE);
        if (onePiece.isPresent()) {
            return toSelection(onePiece.get()).map(List::of).orElse(List.of());
        }

        List<GarmentSelection> ordered = new ArrayList<>();
        findUpperItem(items).flatMap(this::toSelection).ifPresent(ordered::add);
        findByRole(items, ItemRole.BOTTOM).flatMap(this::toSelection).ifPresent(ordered::add);
        return ordered;
    }

    private Optional<TryOnItem> findUpperItem(List<TryOnItem> items) {
        return findByRole(items, ItemRole.TOP).or(() -> findByRole(items, ItemRole.OUTERWEAR));
    }

    private static Optional<TryOnItem> findByRole(List<TryOnItem> items, ItemRole role) {
        return items.stream().filter(item -> item.getRole() == role).findFirst();
    }

    private Optional<GarmentSelection> toSelection(TryOnItem item) {
        String category = toVtonCategory(item.getRole());
        if (category == null) {
            return Optional.empty();
        }
        String imageUrl = mediaUrlResolver.resolvePublicUrl(
                outfitCompositionService.resolveProductImageUrl(item.getProductId()));
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
