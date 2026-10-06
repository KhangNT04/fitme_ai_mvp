package com.fitme.brandplus.service;

import com.fitme.settings.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/** Ranking priority for Brand Plus products, resolved once per request (one setting read, one query). */
@Component
@RequiredArgsConstructor
public class BrandPlusPriority {

    private final BrandPlusService brandPlusService;
    private final SystemSettingsService settingsService;

    /** A boost of 0 turns the priority off and skips the Plus lookup entirely. */
    public Snapshot snapshot() {
        int boost = settingsService.recommendationPlusBoost();
        if (boost <= 0) {
            return Snapshot.NONE;
        }
        return new Snapshot(Set.copyOf(brandPlusService.activePlusBrandIds()), boost);
    }

    public record Snapshot(Set<UUID> plusBrandIds, int boost) {

        public static final Snapshot NONE = new Snapshot(Set.of(), 0);

        public boolean isPlus(UUID brandId) {
            return brandId != null && plusBrandIds.contains(brandId);
        }

        public int bonus(UUID brandId) {
            return isPlus(brandId) ? boost : 0;
        }
    }
}
