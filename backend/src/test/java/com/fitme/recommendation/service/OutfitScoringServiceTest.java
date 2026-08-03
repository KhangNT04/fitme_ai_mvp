package com.fitme.recommendation.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.enums.ProductTargetGender;
import com.fitme.common.enums.StockStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductTag;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.userprofile.entity.BodyProfile;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutfitScoringServiceTest {

    @Mock
    private com.fitme.product.repository.ProductTagRepository tagRepository;
    @Mock
    private ProductAudienceService productAudienceService;
    @Mock
    private UserStylingContextService userStylingContextService;

    @InjectMocks
    private OutfitScoringService outfitScoringService;

    @Test
    void withinBudget_respectsMax() {
        Product p = Product.builder().price(BigDecimal.valueOf(500000)).build();
        assertThat(outfitScoringService.withinBudget(p, null, BigDecimal.valueOf(400000))).isFalse();
        assertThat(outfitScoringService.withinBudget(p, null, BigDecimal.valueOf(600000))).isTrue();
    }

    @Test
    void scoreProduct_boostsMatchingStyleTag() {
        UUID id = UUID.randomUUID();
        Product p = Product.builder()
                .id(id)
                .fitType(FitPreference.REGULAR)
                .stockStatus(StockStatus.IN_STOCK)
                .build();
        BodyProfile body = BodyProfile.builder().fitPreference(FitPreference.REGULAR).build();

        when(tagRepository.findByProductId(id)).thenReturn(List.of(
                ProductTag.builder().tagType("STYLE").tagValue("Minimal").build()
        ));
        when(productAudienceService.resolveTargetGender(p)).thenReturn(ProductTargetGender.UNISEX);
        when(userStylingContextService.scoreAgeAlignment(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()))
                .thenReturn(0.0);

        double score = outfitScoringService.scoreProduct(p, "Minimal", body);
        assertThat(score).isGreaterThan(30);
    }

    @Test
    void preferenceAndCoherence_boostsSameBrandOnPrefer() {
        UUID brandId = UUID.randomUUID();
        Product p = Product.builder().brandId(brandId).build();
        OutfitScoreContext ctx = new OutfitScoreContext(
                OutfitCoherenceMode.PREFER,
                brandId,
                Set.of(),
                Map.of(),
                Map.of(brandId.toString(), 1.0),
                Map.of(),
                1.75);
        double bonus = outfitScoringService.preferenceAndCoherenceBonus(p, null, ctx);
        assertThat(bonus).isGreaterThan(22);
    }

    @Test
    void preferenceAndCoherence_offSkipsBrandBonus() {
        UUID brandId = UUID.randomUUID();
        Product p = Product.builder().brandId(brandId).build();
        OutfitScoreContext ctx = new OutfitScoreContext(
                OutfitCoherenceMode.OFF,
                brandId,
                Set.of(),
                Map.of(),
                Map.of(),
                Map.of(),
                1.0);
        assertThat(outfitScoringService.preferenceAndCoherenceBonus(p, null, ctx)).isZero();
    }

    @Test
    void matchesCoherenceFilter_strictKeepsPartners() {
        UUID preferred = UUID.randomUUID();
        UUID partner = UUID.randomUUID();
        UUID other = UUID.randomUUID();
        OutfitScoreContext ctx = new OutfitScoreContext(
                OutfitCoherenceMode.STRICT,
                preferred,
                Set.of(partner),
                Map.of(),
                Map.of(),
                Map.of(),
                1.0);
        assertThat(outfitScoringService.matchesCoherenceFilter(
                Product.builder().brandId(partner).build(), ctx)).isTrue();
        assertThat(outfitScoringService.matchesCoherenceFilter(
                Product.builder().brandId(other).build(), ctx)).isFalse();
    }
}
