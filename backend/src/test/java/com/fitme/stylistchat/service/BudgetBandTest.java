package com.fitme.stylistchat.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class BudgetBandTest {

    @Test
    void readsBandFromQuizGoals() {
        BudgetBand band = BudgetBand.fromGoals(Map.of("items", List.of("capsule", "budget:300-500"))).orElseThrow();
        assertThat(band.min()).isEqualByComparingTo(BigDecimal.valueOf(300_000));
        assertThat(band.max()).isEqualByComparingTo(BigDecimal.valueOf(500_000));
    }

    @Test
    void openEndedBands() {
        assertThat(BudgetBand.fromKey("under-300").orElseThrow().min()).isNull();
        assertThat(BudgetBand.fromKey("800-plus").orElseThrow().max()).isNull();
    }

    @Test
    void ignoresMissingOrUnknownBudget() {
        assertThat(BudgetBand.fromGoals(null)).isEmpty();
        assertThat(BudgetBand.fromGoals(Map.of("items", List.of("capsule")))).isEmpty();
        assertThat(BudgetBand.fromGoals(Map.of("items", List.of("budget:huge")))).isEmpty();
    }
}
