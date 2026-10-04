package com.fitme.common.util;

import java.util.Optional;

public final class EnumParser {

    private EnumParser() {
    }

    /** Exact (case-sensitive) name lookup; empty for null or unknown values. */
    public static <E extends Enum<E>> Optional<E> parse(Class<E> type, String value) {
        if (value == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(Enum.valueOf(type, value));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
