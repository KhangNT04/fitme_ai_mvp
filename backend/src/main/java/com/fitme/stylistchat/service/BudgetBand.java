package com.fitme.stylistchat.service;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Per-item price band picked in the vibe quiz, stored in body profile goals as {@code budget:<band>}
 * (band keys mirror {@code BUDGET_BANDS} in the frontend constants).
 */
public record BudgetBand(BigDecimal min, BigDecimal max) {

    private static final String PREFIX = "budget:";

    public static Optional<BudgetBand> fromGoals(Map<String, Object> goals) {
        if (goals == null) return Optional.empty();
        Object items = goals.get("items");
        if (!(items instanceof Collection<?> list)) return Optional.empty();
        return list.stream()
                .map(String::valueOf)
                .filter(s -> s.startsWith(PREFIX))
                .map(s -> s.substring(PREFIX.length()))
                .map(BudgetBand::fromKey)
                .flatMap(Optional::stream)
                .findFirst();
    }

    static Optional<BudgetBand> fromKey(String key) {
        return switch (key) {
            case "under-300" -> Optional.of(new BudgetBand(null, vnd(300_000)));
            case "300-500" -> Optional.of(new BudgetBand(vnd(300_000), vnd(500_000)));
            case "500-800" -> Optional.of(new BudgetBand(vnd(500_000), vnd(800_000)));
            case "800-plus" -> Optional.of(new BudgetBand(vnd(800_000), null));
            default -> Optional.empty();
        };
    }

    private static BigDecimal vnd(long amount) {
        return BigDecimal.valueOf(amount);
    }
}
