package com.fitme.recommendation.service;

import com.fitme.common.enums.BrandMixMode;
import com.fitme.common.enums.OutfitCoherenceMode;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Scoring context for brand coherence + learned preference weights, plus the Premium favorite brands
 * ({@code favoriteBrandIds} stays empty for Free users) and the Brand Plus priority resolved once per request
 * ({@code plusBrandIds} is empty when the boost is off).
 */
public record OutfitScoreContext(
        OutfitCoherenceMode coherenceMode,
        UUID preferredBrandId,
        Set<UUID> partnerBrandIds,
        Map<String, Double> styleWeights,
        Map<String, Double> brandWeights,
        Map<String, Double> colorWeights,
        double preferenceScale,
        Set<UUID> favoriteBrandIds,
        BrandMixMode brandMixMode,
        Set<UUID> plusBrandIds,
        double plusBoost) {

    public OutfitScoreContext(
            OutfitCoherenceMode coherenceMode,
            UUID preferredBrandId,
            Set<UUID> partnerBrandIds,
            Map<String, Double> styleWeights,
            Map<String, Double> brandWeights,
            Map<String, Double> colorWeights,
            double preferenceScale) {
        this(coherenceMode, preferredBrandId, partnerBrandIds, styleWeights, brandWeights, colorWeights,
                preferenceScale, Set.of(), BrandMixMode.DIVERSE);
    }

    public OutfitScoreContext(
            OutfitCoherenceMode coherenceMode,
            UUID preferredBrandId,
            Set<UUID> partnerBrandIds,
            Map<String, Double> styleWeights,
            Map<String, Double> brandWeights,
            Map<String, Double> colorWeights,
            double preferenceScale,
            Set<UUID> favoriteBrandIds,
            BrandMixMode brandMixMode) {
        this(coherenceMode, preferredBrandId, partnerBrandIds, styleWeights, brandWeights, colorWeights,
                preferenceScale, favoriteBrandIds, brandMixMode, Set.of(), 0);
    }

    public static OutfitScoreContext empty() {
        return new OutfitScoreContext(
                OutfitCoherenceMode.OFF,
                null,
                Set.of(),
                Map.of(),
                Map.of(),
                Map.of(),
                1.0);
    }

    public Set<UUID> partnerBrandIds() {
        return partnerBrandIds == null ? Set.of() : partnerBrandIds;
    }

    public Map<String, Double> styleWeights() {
        return styleWeights == null ? Collections.emptyMap() : styleWeights;
    }

    public Map<String, Double> brandWeights() {
        return brandWeights == null ? Collections.emptyMap() : brandWeights;
    }

    public Map<String, Double> colorWeights() {
        return colorWeights == null ? Collections.emptyMap() : colorWeights;
    }

    public double preferenceScale() {
        return preferenceScale > 0 ? preferenceScale : 1.0;
    }

    public Set<UUID> favoriteBrandIds() {
        return favoriteBrandIds == null ? Set.of() : favoriteBrandIds;
    }

    public BrandMixMode brandMixMode() {
        return brandMixMode == null ? BrandMixMode.DIVERSE : brandMixMode;
    }

    public boolean favoritesOnly() {
        return brandMixMode() == BrandMixMode.FAVORITES_ONLY && !favoriteBrandIds().isEmpty();
    }

    public Set<UUID> plusBrandIds() {
        return plusBrandIds == null ? Set.of() : plusBrandIds;
    }

    public double plusBoost() {
        return Math.max(0, plusBoost);
    }

    public boolean isPlusBrand(UUID brandId) {
        return brandId != null && plusBoost() > 0 && plusBrandIds().contains(brandId);
    }
}
