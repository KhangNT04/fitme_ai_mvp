package com.fitme.ai;

import com.fitme.ai.dto.GeminiStylistResult;

import java.util.Optional;

public record StylistSuggestOutcome(Optional<GeminiStylistResult> result, String fallbackReason) {

    public static StylistSuggestOutcome success(GeminiStylistResult value) {
        return new StylistSuggestOutcome(Optional.of(value), null);
    }

    public static StylistSuggestOutcome fallback(String reason) {
        return new StylistSuggestOutcome(Optional.empty(), reason);
    }
}
