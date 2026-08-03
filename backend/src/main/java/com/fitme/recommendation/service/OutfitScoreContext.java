package com.fitme.recommendation.service;

import com.fitme.common.enums.OutfitCoherenceMode;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Scoring context for brand coherence + learned preference weights.
 */
public record OutfitScoreContext(
        OutfitCoherenceMode coherenceMode,
        UUID preferredBrandId,
        Set<UUID> partnerBrandIds,
        Map<String, Double> styleWeights,
        Map<String, Double> brandWeights,
        Map<String, Double> colorWeights,
        double preferenceScale) {

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
}
