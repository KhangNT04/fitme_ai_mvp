package com.fitme.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.ai.client.GeminiStylistClient;
import com.fitme.ai.dto.GeminiOutfitSuggestion;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ProductTargetGender;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductTagRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.service.OutfitCompositionService;
import com.fitme.recommendation.service.OutfitExplanationComposer;
import com.fitme.recommendation.service.SizeResolutionService;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GeminiStylistServiceTest {

    @Mock
    private BrandRepository brandRepository;
    @Mock
    private ProductTagRepository tagRepository;
    @Mock
    private ProductVariantRepository variantRepository;
    @Mock
    private ProductImageRepository imageRepository;
    @Mock
    private WardrobeItemRepository wardrobeItemRepository;
    @Mock
    private SizeChartRepository sizeChartRepository;
    @Mock
    private ProductAudienceService productAudienceService;

    @InjectMocks
    private ProductEligibilityService eligibilityService;
    @InjectMocks
    private SizeResolutionService sizeResolutionService;

    private GeminiStylistService service;
    private FakeGeminiStylistClient fakeClient;

    @BeforeEach
    void setUp() {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setStylistMode("gemini");
        properties.getAi().setGeminiApiKey("test-key");

        OutfitCompositionService composition = new OutfitCompositionService(
                variantRepository, imageRepository, wardrobeItemRepository, eligibilityService, sizeResolutionService,
                new OutfitExplanationComposer(), productAudienceService);
        StylistContextBuilder contextBuilder = new StylistContextBuilder(
                new ObjectMapper(),
                properties,
                brandRepository,
                tagRepository,
                variantRepository,
                composition,
                productAudienceService);
        GeminiOutfitValidator validator = new GeminiOutfitValidator(
                composition, sizeResolutionService, eligibilityService, productAudienceService);
        fakeClient = new FakeGeminiStylistClient();
        service = new GeminiStylistService(properties, fakeClient, contextBuilder, validator, sizeResolutionService);
    }

    @Test
    void suggest_returnsResultWhenGeminiValid() throws Exception {
        UUID topId = UUID.randomUUID();
        UUID brandId = UUID.randomUUID();
        Product top = Product.builder().id(topId).brandId(brandId).name("Top").category("Áo thun").build();
        BodyProfile body = BodyProfile.builder().heightCm(165).weightKg(BigDecimal.valueOf(55)).build();
        StyleProfile style = StyleProfile.builder().primaryStyle("Casual").build();
        CreateRecommendationRequest request = new CreateRecommendationRequest();
        request.setOccasion("Đi cafe");
        request.setWardrobeMode(WardrobeMode.NO_WARDROBE_DATA);

        GeminiOutfitSuggestion suggestion = new GeminiOutfitSuggestion();
        suggestion.setTitle("Outfit test");
        suggestion.setRecommendedSize("M");
        suggestion.setConfidence("HIGH");
        GeminiOutfitSuggestion.Item item = new GeminiOutfitSuggestion.Item();
        item.setProductId(topId.toString());
        item.setRole("TOP");
        item.setSelectedSize("M");
        suggestion.setItems(List.of(item));
        GeminiOutfitSuggestion.Explanation explanation = new GeminiOutfitSuggestion.Explanation();
        explanation.setBodyFit("Fit ok");
        explanation.setStyleFit("Style ok");
        explanation.setOccasionFit("Occasion ok");
        explanation.setColorFit("Color ok");
        suggestion.setExplanation(explanation);

        fakeClient.willReturn(Optional.of(suggestion));
        when(variantRepository.findByProductId(any())).thenReturn(List.of());
        when(imageRepository.findByProductIdOrderBySortOrderAsc(any())).thenReturn(List.of());
        when(sizeChartRepository.findByProductId(any())).thenReturn(List.of());
        when(brandRepository.findById(any())).thenReturn(Optional.empty());
        when(tagRepository.findByProductId(any())).thenReturn(List.of());
        when(productAudienceService.resolveTargetGender(any(Product.class)))
                .thenReturn(ProductTargetGender.UNISEX);
        when(productAudienceService.isRecommendableFor(any(), any(Product.class))).thenReturn(true);

        assertThat(service.suggest(body, style, request, List.of(), List.of(top), null))
                .satisfies(outcome -> {
                    assertThat(outcome.result()).isPresent();
                    assertThat(outcome.fallbackReason()).isNull();
                    assertThat(outcome.result().get().title()).isEqualTo("Outfit test");
                    assertThat(outcome.result().get().items()).hasSize(1);
                    assertThat(outcome.result().get().explanationStyle()).isEqualTo("Style ok");
                });
    }

    @Test
    void suggest_returnsEmptyWhenClientFails() {
        BodyProfile body = BodyProfile.builder().heightCm(165).weightKg(BigDecimal.valueOf(55)).build();
        StyleProfile style = StyleProfile.builder().primaryStyle("Casual").build();
        CreateRecommendationRequest request = new CreateRecommendationRequest();
        request.setWardrobeMode(WardrobeMode.NO_WARDROBE_DATA);

        fakeClient.willReturn(Optional.empty());

        assertThat(service.suggest(body, style, request, List.of(), List.of(), null))
                .satisfies(outcome -> {
                    assertThat(outcome.result()).isEmpty();
                    assertThat(outcome.fallbackReason()).isEqualTo("gemini_empty");
                });
    }

    static class FakeGeminiStylistClient extends GeminiStylistClient {
        private Optional<GeminiOutfitSuggestion> response = Optional.empty();

        FakeGeminiStylistClient() {
            super(new FitMeProperties(), new ObjectMapper());
        }

        void willReturn(Optional<GeminiOutfitSuggestion> next) {
            this.response = next;
        }

        @Override
        public Optional<GeminiOutfitSuggestion> suggestOutfit(String contextJson) {
            return response;
        }
    }
}
