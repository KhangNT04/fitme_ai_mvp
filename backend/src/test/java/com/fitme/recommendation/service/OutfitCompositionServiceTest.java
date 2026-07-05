package com.fitme.recommendation.service;

import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutfitCompositionServiceTest {

    @Mock
    private ProductVariantRepository variantRepository;
    @Mock
    private ProductImageRepository imageRepository;
    @Mock
    private WardrobeItemRepository wardrobeItemRepository;
    @Mock
    private SizeChartRepository sizeChartRepository;

    private OutfitCompositionService service;
    private BodyProfile body;
    private StyleProfile style;

    @BeforeEach
    void setUp() {
        ProductEligibilityService eligibilityService = new ProductEligibilityService(
                imageRepository, variantRepository, sizeChartRepository, null);
        SizeResolutionService sizeResolutionService = new SizeResolutionService(sizeChartRepository, variantRepository);
        service = new OutfitCompositionService(
                variantRepository, imageRepository, wardrobeItemRepository, eligibilityService, sizeResolutionService);
        body = BodyProfile.builder().heightCm(165).weightKg(BigDecimal.valueOf(55)).build();
        style = StyleProfile.builder().primaryStyle("Casual").build();
        when(variantRepository.findByProductId(any())).thenReturn(List.of());
        when(imageRepository.findByProductIdOrderBySortOrderAsc(any())).thenReturn(List.of());
        when(sizeChartRepository.findByProductId(any())).thenReturn(List.of());
    }

    @Test
    void buildOutfit_capsRuleFallbackToCoreRoles() {
        UUID brandId = UUID.randomUUID();
        List<Product> eligible = new ArrayList<>();
        eligible.add(product("Áo thun", brandId));
        eligible.add(product("Quần jean", brandId));
        eligible.add(product("Giày sneaker", brandId));
        eligible.add(product("Áo khoác", brandId));
        eligible.add(product("Túi xách", brandId));

        List<RecommendationResponse.OutfitItemDto> items = service.buildOutfit(
                null, eligible, List.of(), WardrobeMode.NO_WARDROBE_DATA, body, style);

        assertThat(items).hasSizeLessThanOrEqualTo(3);
        assertThat(items.stream().map(RecommendationResponse.OutfitItemDto::getRole))
                .containsExactlyInAnyOrder(ItemRole.TOP, ItemRole.BOTTOM, ItemRole.SHOES);
    }

    private static Product product(String category, UUID brandId) {
        return Product.builder()
                .id(UUID.randomUUID())
                .brandId(brandId)
                .name(category)
                .category(category)
                .build();
    }
}
