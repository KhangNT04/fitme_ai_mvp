package com.fitme.ai;

import com.fitme.common.enums.ItemRole;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.storage.MediaUrlResolver;
import com.fitme.tryon.entity.TryOnItem;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VtonCategoryMapperTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OutfitCompositionService outfitCompositionService;

    @Mock
    private MediaUrlResolver mediaUrlResolver;

    @InjectMocks
    private VtonCategoryMapper mapper;

    @Test
    void toVtonCategory_mapsRoles() {
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.TOP)).isEqualTo("tops");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.OUTERWEAR)).isEqualTo("tops");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.BOTTOM)).isEqualTo("bottoms");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.ONE_PIECE)).isEqualTo("one-pieces");
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.SHOES)).isNull();
        assertThat(VtonCategoryMapper.toVtonCategory(ItemRole.ACCESSORY)).isNull();
    }

    @Test
    void isSupportedRole_excludesShoesAndAccessory() {
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.TOP)).isTrue();
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.ONE_PIECE)).isTrue();
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.SHOES)).isFalse();
        assertThat(VtonCategoryMapper.isSupportedRole(ItemRole.ACCESSORY)).isFalse();
    }

    @Test
    void selectGarments_onePieceAlone_skipsTopAndBottom() {
        stubResolvableImages();
        TryOnItem onePiece = item(ItemRole.ONE_PIECE);
        TryOnItem top = item(ItemRole.TOP);
        TryOnItem bottom = item(ItemRole.BOTTOM);

        List<VtonCategoryMapper.GarmentSelection> result =
                mapper.selectGarments(List.of(top, onePiece, bottom));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).category()).isEqualTo("one-pieces");
    }

    @Test
    void selectGarments_topAndBottom_returnsSequentialUpperThenLower() {
        stubResolvableImages();
        TryOnItem top = item(ItemRole.TOP);
        TryOnItem bottom = item(ItemRole.BOTTOM);

        List<VtonCategoryMapper.GarmentSelection> result = mapper.selectGarments(List.of(bottom, top));

        assertThat(result).hasSize(2);
        assertThat(result.get(0).category()).isEqualTo("tops");
        assertThat(result.get(1).category()).isEqualTo("bottoms");
    }

    @Test
    void selectGarments_outerwearOnly_usedAsUpperGarment() {
        stubResolvableImages();
        TryOnItem outerwear = item(ItemRole.OUTERWEAR);

        List<VtonCategoryMapper.GarmentSelection> result = mapper.selectGarments(List.of(outerwear));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).category()).isEqualTo("tops");
    }

    @Test
    void selectGarments_shoesAndAccessoryOnly_returnsEmpty() {
        List<VtonCategoryMapper.GarmentSelection> result =
                mapper.selectGarments(List.of(item(ItemRole.SHOES), item(ItemRole.ACCESSORY)));

        assertThat(result).isEmpty();
    }

    private void stubResolvableImages() {
        lenient().when(outfitCompositionService.resolveProductImageUrl(any())).thenReturn("/catalog/x.jpg");
        lenient().when(mediaUrlResolver.resolvePublicUrl(any())).thenReturn("https://cdn.example/x.jpg");
        lenient().when(productRepository.findById(any()))
                .thenReturn(Optional.of(Product.builder().name("Test product").build()));
    }

    private static TryOnItem item(ItemRole role) {
        return TryOnItem.builder().productId(UUID.randomUUID()).role(role).build();
    }
}
