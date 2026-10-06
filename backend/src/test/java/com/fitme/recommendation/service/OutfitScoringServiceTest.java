package com.fitme.recommendation.service;

import com.fitme.common.enums.BrandMixMode;
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

    @Test
    void favoriteBrandBonus_diverseGivesSmallBoostOnly() {
        UUID favorite = UUID.randomUUID();
        OutfitScoreContext ctx = favoritesContext(Set.of(favorite), BrandMixMode.DIVERSE);
        assertThat(outfitScoringService.favoriteBrandBonus(Product.builder().brandId(favorite).build(), ctx))
                .isEqualTo(8);
        assertThat(outfitScoringService.favoriteBrandBonus(Product.builder().brandId(UUID.randomUUID()).build(), ctx))
                .isZero();
    }

    @Test
    void favoriteBrandBonus_favoritesOnlyBoostsFavoritesAndPenalizesOthers() {
        UUID favorite = UUID.randomUUID();
        OutfitScoreContext ctx = favoritesContext(Set.of(favorite), BrandMixMode.FAVORITES_ONLY);
        assertThat(ctx.favoritesOnly()).isTrue();
        assertThat(outfitScoringService.favoriteBrandBonus(Product.builder().brandId(favorite).build(), ctx))
                .isEqualTo(40);
        assertThat(outfitScoringService.favoriteBrandBonus(Product.builder().brandId(UUID.randomUUID()).build(), ctx))
                .isEqualTo(-30);
    }

    @Test
    void favoriteBrandBonus_noFavoritesMeansNoEffect() {
        OutfitScoreContext ctx = new OutfitScoreContext(
                OutfitCoherenceMode.OFF, null, Set.of(), Map.of(), Map.of(), Map.of(), 1.0);
        assertThat(ctx.favoritesOnly()).isFalse();
        assertThat(outfitScoringService.favoriteBrandBonus(Product.builder().brandId(UUID.randomUUID()).build(), ctx))
                .isZero();
    }

    @Test
    void plusBrand_outranksNonPlusWithEqualOtherFactors() {
        UUID plusBrand = UUID.randomUUID();
        Product plus = equalProduct(plusBrand);
        Product regular = equalProduct(UUID.randomUUID());
        OutfitScoreContext ctx = plusContext(Set.of(), BrandMixMode.DIVERSE, Set.of(plusBrand), 15);

        double plusScore = outfitScoringService.scoreProduct(plus, "Minimal", null, null, ctx);
        double regularScore = outfitScoringService.scoreProduct(regular, "Minimal", null, null, ctx);

        assertThat(plusScore - regularScore).isEqualTo(15);
    }

    @Test
    void plusBrand_boostOfZeroHasNoEffect() {
        UUID plusBrand = UUID.randomUUID();
        OutfitScoreContext ctx = plusContext(Set.of(), BrandMixMode.DIVERSE, Set.of(plusBrand), 0);
        assertThat(ctx.isPlusBrand(plusBrand)).isFalse();
        assertThat(outfitScoringService.plusBrandBonus(equalProduct(plusBrand), ctx)).isZero();
    }

    @Test
    void favoritesOnly_favoriteNonPlusOutranksNonFavoritePlus() {
        UUID favorite = UUID.randomUUID();
        UUID plusBrand = UUID.randomUUID();
        Product favoriteProduct = equalProduct(favorite);
        Product plusProduct = equalProduct(plusBrand);
        OutfitScoreContext ctx = plusContext(Set.of(favorite), BrandMixMode.FAVORITES_ONLY, Set.of(plusBrand), 15);

        assertThat(outfitScoringService.scoreProduct(favoriteProduct, "Minimal", null, null, ctx))
                .isGreaterThan(outfitScoringService.scoreProduct(plusProduct, "Minimal", null, null, ctx));
    }

    @Test
    void diverse_favoriteNonPlusOutranksNonFavoritePlus() {
        UUID favorite = UUID.randomUUID();
        UUID plusBrand = UUID.randomUUID();
        OutfitScoreContext ctx = plusContext(Set.of(favorite), BrandMixMode.DIVERSE, Set.of(plusBrand), 15);

        assertThat(outfitScoringService.scoreProduct(equalProduct(favorite), "Minimal", null, null, ctx))
                .isGreaterThan(outfitScoringService.scoreProduct(equalProduct(plusBrand), "Minimal", null, null, ctx));
    }

    @Test
    void favoritesOnly_favoriteStillWinsWhenAdminMaxesThePlusBoost() {
        UUID favorite = UUID.randomUUID();
        UUID plusBrand = UUID.randomUUID();
        OutfitScoreContext ctx = plusContext(Set.of(favorite), BrandMixMode.FAVORITES_ONLY, Set.of(plusBrand), 100);

        assertThat(outfitScoringService.scoreProduct(equalProduct(favorite), "Minimal", null, null, ctx))
                .isGreaterThan(outfitScoringService.scoreProduct(equalProduct(plusBrand), "Minimal", null, null, ctx));
    }

    @Test
    void favoritesOnly_plusFavoriteBeatsPlainFavorite() {
        UUID plainFavorite = UUID.randomUUID();
        UUID plusFavorite = UUID.randomUUID();
        OutfitScoreContext ctx = plusContext(Set.of(plainFavorite, plusFavorite), BrandMixMode.FAVORITES_ONLY,
                Set.of(plusFavorite), 15);

        assertThat(outfitScoringService.scoreProduct(equalProduct(plusFavorite), "Minimal", null, null, ctx))
                .isGreaterThan(outfitScoringService.scoreProduct(equalProduct(plainFavorite), "Minimal", null, null, ctx));
    }

    private static Product equalProduct(UUID brandId) {
        return Product.builder()
                .id(UUID.randomUUID())
                .brandId(brandId)
                .name("Áo sơ mi")
                .category("Áo")
                .stockStatus(StockStatus.IN_STOCK)
                .build();
    }

    private static OutfitScoreContext plusContext(
            Set<UUID> favorites, BrandMixMode mode, Set<UUID> plusBrandIds, double boost) {
        return new OutfitScoreContext(
                OutfitCoherenceMode.OFF, null, Set.of(), Map.of(), Map.of(), Map.of(), 1.0, favorites, mode,
                plusBrandIds, boost);
    }

    private static OutfitScoreContext favoritesContext(Set<UUID> favorites, BrandMixMode mode) {
        return new OutfitScoreContext(
                OutfitCoherenceMode.OFF, null, Set.of(), Map.of(), Map.of(), Map.of(), 1.0, favorites, mode);
    }
}
