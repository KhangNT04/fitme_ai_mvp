package com.fitme.tryon.service;

import com.fitme.brand.repository.BrandRepository;
import com.fitme.brandplus.service.BrandPlusPriority;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.recommendation.service.OutfitExplanationComposer;
import com.fitme.tryon.dto.OutfitSuggestionsResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TryOnOutfitCompletionServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private BrandRepository brandRepository;
    @Mock
    private BrandPlusPriority brandPlusPriority;

    private TryOnOutfitCompletionService service;

    @BeforeEach
    void setUp() {
        ProductEligibilityService eligibilityService = new ProductEligibilityService(
                mock(ProductImageRepository.class),
                mock(ProductVariantRepository.class),
                mock(SizeChartRepository.class));
        OutfitCompositionService composition = new OutfitCompositionService(
                null, null, null, null, null, null, null, null, new OutfitExplanationComposer(),
                new ProductAudienceService(mock(com.fitme.product.repository.ProductTagRepository.class)));
        service = new TryOnOutfitCompletionService(
                productRepository, eligibilityService, composition, brandRepository, null, brandPlusPriority);
    }

    @Test
    void analyzeProductIds_treatsSuitAsCoveringBottom() {
        UUID productId = UUID.randomUUID();
        Product suit = Product.builder()
                .id(productId)
                .brandId(UUID.randomUUID())
                .name("Vest nam")
                .category("Vest 3 mảnh")
                .build();

        when(productRepository.findById(productId)).thenReturn(Optional.of(suit));
        when(productRepository.findByStatus(ProductStatus.ACTIVE)).thenReturn(List.of());
        when(brandPlusPriority.snapshot()).thenReturn(BrandPlusPriority.Snapshot.NONE);

        OutfitSuggestionsResponse response = service.analyzeProductIds(List.of(productId));

        assertThat(response.isOutfitComplete()).isTrue();
        assertThat(response.getMissingRoles()).isEmpty();
    }

    @Test
    void missingRoleSuggestion_prefersBrandPlusProductOverEarlierRegularOne() {
        ProductEligibilityService eligibilityService = mock(ProductEligibilityService.class);
        OutfitCompositionService composition = new OutfitCompositionService(
                null, mock(ProductImageRepository.class), null, null, null, null, null, null,
                new OutfitExplanationComposer(),
                new ProductAudienceService(mock(com.fitme.product.repository.ProductTagRepository.class)));
        TryOnOutfitCompletionService plusAware = new TryOnOutfitCompletionService(
                productRepository, eligibilityService, composition, brandRepository, null, brandPlusPriority);

        UUID plusBrand = UUID.randomUUID();
        Product top = Product.builder().id(UUID.randomUUID()).brandId(UUID.randomUUID())
                .name("Áo thun").category("Áo").build();
        Product regularBottom = Product.builder().id(UUID.randomUUID()).brandId(UUID.randomUUID())
                .name("Quần jean").category("Quần").build();
        Product plusBottom = Product.builder().id(UUID.randomUUID()).brandId(plusBrand)
                .name("Quần tây").category("Quần").build();

        when(productRepository.findById(top.getId())).thenReturn(Optional.of(top));
        when(productRepository.findByStatus(ProductStatus.ACTIVE)).thenReturn(List.of(regularBottom, plusBottom));
        when(brandRepository.findById(org.mockito.ArgumentMatchers.any())).thenReturn(Optional.of(
                com.fitme.brand.entity.Brand.builder().status(com.fitme.common.enums.BrandStatus.APPROVED).build()));
        when(eligibilityService.canBeUsedForAiTryOn(org.mockito.ArgumentMatchers.any())).thenReturn(true);
        when(brandPlusPriority.snapshot()).thenReturn(new BrandPlusPriority.Snapshot(java.util.Set.of(plusBrand), 15));

        OutfitSuggestionsResponse response = plusAware.analyzeProductIds(List.of(top.getId()));

        assertThat(response.getSuggestedItems()).singleElement()
                .satisfies(item -> assertThat(item.getProductId()).isEqualTo(plusBottom.getId()));
    }
}
