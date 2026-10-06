package com.fitme.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum ConsumerPlan {
    FREE,
    PREMIUM;

    /** Accepts the legacy {@code PRO} / {@code PLUS} values from older clients/admin tools as {@link #PREMIUM}. */
    @JsonCreator
    public static ConsumerPlan fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return FREE;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if ("PRO".equals(normalized) || "PLUS".equals(normalized)) {
            return PREMIUM;
        }
        return ConsumerPlan.valueOf(normalized);
    }
}
