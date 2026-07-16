package com.fitme.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.brand.entity.Brand;
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
import com.fitme.recommendation.service.UserStylingContextService;
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
class StylistContextBuilderTest {

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

    private StylistContextBuilder builder;

    @BeforeEach
    void setUp() {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setStylistCandidateLimit(2);
        OutfitCompositionService composition = new OutfitCompositionService(
                variantRepository, imageRepository, wardrobeItemRepository, eligibilityService, sizeResolutionService,
                new OutfitExplanationComposer(), productAudienceService);
        builder = new StylistContextBuilder(
                new ObjectMapper(),
                properties,
                brandRepository,
                tagRepository,
                variantRepository,
                composition,
                productAudienceService,
                new UserStylingContextService());
    }

    @Test
    void buildContext_limitsCandidates() throws Exception {
        UUID brandId = UUID.randomUUID();
        Product p1 = Product.builder().id(UUID.randomUUID()).brandId(brandId).name("A").category("Áo").build();
        Product p2 = Product.builder().id(UUID.randomUUID()).brandId(brandId).name("B").category("Quần").build();
        Product p3 = Product.builder().id(UUID.randomUUID()).brandId(brandId).name("C").category("Giày").build();

        when(brandRepository.findById(any())).thenReturn(Optional.of(Brand.builder().name("Brand").build()));
        when(tagRepository.findByProductId(any())).thenReturn(List.of());
        when(variantRepository.findByProductId(any())).thenReturn(List.of());
        when(productAudienceService.resolveTargetGender(any(Product.class)))
                .thenReturn(ProductTargetGender.UNISEX);

        BodyProfile body = BodyProfile.builder().heightCm(165).weightKg(BigDecimal.valueOf(55)).build();
        StyleProfile style = StyleProfile.builder().primaryStyle("Casual").build();
        CreateRecommendationRequest request = new CreateRecommendationRequest();
        request.setOccasion("Đi cafe");
        request.setWardrobeMode(WardrobeMode.NO_WARDROBE_DATA);

        String json = builder.buildContext(body, style, request, List.of(), List.of(p1, p2, p3), null);
        JsonNode root = new ObjectMapper().readTree(json);

        assertThat(root.get("candidates")).hasSize(2);
        assertThat(root.get("user").get("heightCm").asInt()).isEqualTo(165);
        assertThat(root.get("style").get("primaryStyle").asText()).isEqualTo("Casual");
    }
}
