package com.fitme.ai;

import com.fitme.ai.dto.GeminiOutfitSuggestion;
import com.fitme.common.enums.Confidence;
import com.fitme.common.enums.ItemRole;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.recommendation.service.SizeResolutionService;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GeminiOutfitValidatorTest {

    @Mock
    private ProductVariantRepository variantRepository;
    @Mock
    private ProductImageRepository imageRepository;
    @Mock
    private WardrobeItemRepository wardrobeItemRepository;
    @Mock
    private SizeChartRepository sizeChartRepository;

    @InjectMocks
    private ProductEligibilityService eligibilityService;
    @InjectMocks
    private SizeResolutionService sizeResolutionService;

    private GeminiOutfitValidator validator;

    @BeforeEach
    void setUp() {
        OutfitCompositionService composition = new OutfitCompositionService(
                variantRepository, imageRepository, wardrobeItemRepository, eligibilityService, sizeResolutionService);
        validator = new GeminiOutfitValidator(composition, sizeResolutionService, eligibilityService);
    }

    @Test
    void parseConfidence_mapsKnownValues() {
        assertThat(GeminiOutfitValidator.parseConfidence("HIGH")).isEqualTo(Confidence.HIGH);
        assertThat(GeminiOutfitValidator.parseConfidence(null)).isEqualTo(Confidence.MEDIUM);
        assertThat(GeminiOutfitValidator.parseConfidence("unknown")).isEqualTo(Confidence.MEDIUM);
    }

    @Test
    void validateAndMap_acceptsValidSuggestion() {
        UUID topId = UUID.randomUUID();
        UUID bottomId = UUID.randomUUID();
        Product top = Product.builder().id(topId).name("Top").category("Áo thun").build();
        Product bottom = Product.builder().id(bottomId).name("Bottom").category("Quần jean").build();
        BodyProfile body = BodyProfile.builder().heightCm(165).weightKg(BigDecimal.valueOf(55)).build();

        GeminiOutfitSuggestion suggestion = new GeminiOutfitSuggestion();
        GeminiOutfitSuggestion.Item topItem = new GeminiOutfitSuggestion.Item();
        topItem.setProductId(topId.toString());
        topItem.setRole("TOP");
        topItem.setSelectedSize("M");
        GeminiOutfitSuggestion.Item bottomItem = new GeminiOutfitSuggestion.Item();
        bottomItem.setProductId(bottomId.toString());
        bottomItem.setRole("BOTTOM");
        suggestion.setItems(List.of(topItem, bottomItem));

        when(variantRepository.findByProductId(any())).thenReturn(List.of());
        when(imageRepository.findByProductIdOrderBySortOrderAsc(any())).thenReturn(List.of());
        when(sizeChartRepository.findByProductId(any())).thenReturn(List.of());

        List<RecommendationResponse.OutfitItemDto> items =
                validator.validateAndMap(suggestion, List.of(top, bottom), body);

        assertThat(items).hasSize(2);
        assertThat(items.get(0).getSelectedSize()).isEqualTo("M");
        assertThat(items.get(0).getRole()).isEqualTo(ItemRole.TOP);
    }

    @Test
    void validateAndMap_rejectsUnknownProductId() {
        UUID topId = UUID.randomUUID();
        Product top = Product.builder().id(topId).name("Top").build();
        BodyProfile body = BodyProfile.builder().heightCm(165).weightKg(BigDecimal.valueOf(55)).build();

        GeminiOutfitSuggestion suggestion = new GeminiOutfitSuggestion();
        GeminiOutfitSuggestion.Item item = new GeminiOutfitSuggestion.Item();
        item.setProductId(UUID.randomUUID().toString());
        item.setRole("TOP");
        suggestion.setItems(List.of(item));

        assertThatThrownBy(() -> validator.validateAndMap(suggestion, List.of(top), body))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not in candidate set");
    }

    @Test
    void validateAndMap_rejectsDuplicateRole() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        Product p1 = Product.builder().id(id1).name("Top 1").category("Áo thun").build();
        Product p2 = Product.builder().id(id2).name("Top 2").category("Áo sơ mi").build();
        BodyProfile body = BodyProfile.builder().heightCm(165).weightKg(BigDecimal.valueOf(55)).build();

        GeminiOutfitSuggestion suggestion = new GeminiOutfitSuggestion();
        GeminiOutfitSuggestion.Item item1 = new GeminiOutfitSuggestion.Item();
        item1.setProductId(id1.toString());
        item1.setRole("TOP");
        GeminiOutfitSuggestion.Item item2 = new GeminiOutfitSuggestion.Item();
        item2.setProductId(id2.toString());
        item2.setRole("TOP");
        suggestion.setItems(List.of(item1, item2));

        when(variantRepository.findByProductId(any())).thenReturn(List.of());
        when(imageRepository.findByProductIdOrderBySortOrderAsc(any())).thenReturn(List.of());
        when(sizeChartRepository.findByProductId(any())).thenReturn(List.of());

        assertThatThrownBy(() -> validator.validateAndMap(suggestion, List.of(p1, p2), body))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Duplicate role");
    }
}
