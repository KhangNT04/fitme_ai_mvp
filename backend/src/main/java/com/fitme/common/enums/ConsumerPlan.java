package com.fitme.common.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

import java.util.Locale;

public enum ConsumerPlan {
    FREE,
    PRO;

    /** Accepts the legacy {@code PLUS} value from older clients/admin tools as {@link #PRO}. */
    @JsonCreator
    public static ConsumerPlan fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            return FREE;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if ("PLUS".equals(normalized)) {
            return PRO;
        }
        return ConsumerPlan.valueOf(normalized);
    }
}
