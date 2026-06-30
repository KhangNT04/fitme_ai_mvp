package com.fitme.common.util;

import com.fitme.common.enums.FitPreference;

public final class FitCompatibility {

    private FitCompatibility() {
    }

    /** Bonus points when product fit aligns with user preference (0–15). */
    public static int scoreBonus(FitPreference productFit, FitPreference preferredFit) {
        if (productFit == null) {
            return 0;
        }
        if (preferredFit == null || preferredFit == FitPreference.UNSURE) {
            return 8;
        }
        if (productFit == preferredFit) {
            return 15;
        }
        return switch (preferredFit) {
            case OVERSIZE -> productFit == FitPreference.RELAXED || productFit == FitPreference.OVERSIZE ? 12 : 0;
            case RELAXED -> productFit == FitPreference.REGULAR
                    || productFit == FitPreference.RELAXED
                    || productFit == FitPreference.OVERSIZE ? 10 : 0;
            case REGULAR -> productFit == FitPreference.SLIM
                    || productFit == FitPreference.REGULAR
                    || productFit == FitPreference.RELAXED ? 10 : 0;
            case SLIM -> productFit == FitPreference.SLIM || productFit == FitPreference.REGULAR ? 10 : 0;
            default -> 0;
        };
    }
}
