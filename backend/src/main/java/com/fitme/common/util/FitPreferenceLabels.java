package com.fitme.common.util;

import com.fitme.common.enums.FitPreference;

import java.util.Map;

public final class FitPreferenceLabels {

    private static final Map<FitPreference, String> VIETNAMESE = Map.of(
            FitPreference.SLIM, "Ôm (Slim)",
            FitPreference.REGULAR, "Vừa vặn (Regular)",
            FitPreference.RELAXED, "Thoải mái (Relaxed)",
            FitPreference.OVERSIZE, "Rộng (Oversize)",
            FitPreference.UNSURE, "Chưa chắc"
    );

    private FitPreferenceLabels() {
    }

    public static String vietnamese(FitPreference fit) {
        if (fit == null) {
            return VIETNAMESE.get(FitPreference.REGULAR);
        }
        return VIETNAMESE.getOrDefault(fit, fit.name());
    }
}
