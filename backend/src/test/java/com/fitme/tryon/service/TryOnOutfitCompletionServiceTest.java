package com.fitme.tryon.service;

import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
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

    private TryOnOutfitCompletionService service;

    @BeforeEach
    void setUp() {
        ProductEligibilityService eligibilityService = new ProductEligibilityService(
                mock(ProductImageRepository.class),
                mock(ProductVariantRepository.class),
                mock(SizeChartRepository.class),
                null);
        OutfitCompositionService composition = new OutfitCompositionService(
                null, null, null, null, null, new OutfitExplanationComposer(),
                new ProductAudienceService(mock(com.fitme.product.repository.ProductTagRepository.class)));
        service = new TryOnOutfitCompletionService(
                productRepository, eligibilityService, composition, brandRepository, null);
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

        OutfitSuggestionsResponse response = service.analyzeProductIds(List.of(productId));

        assertThat(response.isOutfitComplete()).isTrue();
        assertThat(response.getMissingRoles()).isEmpty();
    }
}
