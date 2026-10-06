package com.fitme.billing.service;

import com.fitme.billing.entity.BillingPlan;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

class PlanPricingTest {

    private static final Instant NOW = Instant.parse("2026-10-07T03:00:00Z");

    @Test
    void noDiscountMeansListPrice() {
        BillingPlan plan = plan(999_000, null, null, null);
        assertThat(PlanPricing.isDiscountActive(plan, NOW)).isFalse();
        assertThat(PlanPricing.effectivePrice(plan, NOW)).isEqualTo(999_000);

        BillingPlan zero = plan(999_000, 0, null, null);
        assertThat(PlanPricing.isDiscountActive(zero, NOW)).isFalse();
        assertThat(PlanPricing.appliedDiscountPercent(zero, NOW)).isZero();
    }

    @Test
    void discountAppliesOnlyInsideInclusiveWindow() {
        Instant start = NOW.minus(1, ChronoUnit.HOURS);
        Instant end = NOW.plus(1, ChronoUnit.HOURS);
        BillingPlan plan = plan(999_000, 20, start, end);

        assertThat(PlanPricing.effectivePrice(plan, NOW)).isEqualTo(799_200);
        assertThat(PlanPricing.isDiscountActive(plan, start)).isTrue();
        assertThat(PlanPricing.isDiscountActive(plan, end)).isTrue();
        assertThat(PlanPricing.isDiscountActive(plan, start.minusMillis(1))).isFalse();
        assertThat(PlanPricing.isDiscountActive(plan, end.plusMillis(1))).isFalse();
        assertThat(PlanPricing.effectivePrice(plan, end.plusMillis(1))).isEqualTo(999_000);
    }

    @Test
    void nullBoundsAreOpen() {
        assertThat(PlanPricing.isDiscountActive(plan(100, 10, null, NOW.plusSeconds(1)), NOW)).isTrue();
        assertThat(PlanPricing.isDiscountActive(plan(100, 10, NOW.minusSeconds(1), null), NOW)).isTrue();
        assertThat(PlanPricing.isDiscountActive(plan(100, 10, null, null), NOW)).isTrue();
        assertThat(PlanPricing.isDiscountActive(plan(100, 10, NOW.plusSeconds(1), null), NOW)).isFalse();
    }

    @Test
    void roundsHalfUpToWholeVnd() {
        assertThat(PlanPricing.discounted(999, 50)).isEqualTo(500);
        assertThat(PlanPricing.discounted(999, 33)).isEqualTo(669);
        assertThat(PlanPricing.discounted(999_000, 33)).isEqualTo(669_330);
        assertThat(PlanPricing.discounted(999_000, 100)).isZero();
        assertThat(PlanPricing.discounted(999_000, 0)).isEqualTo(999_000);
    }

    private static BillingPlan plan(long price, Integer percent, Instant starts, Instant ends) {
        return BillingPlan.builder()
                .priceVnd(price)
                .discountPercent(percent)
                .discountStartsAt(starts)
                .discountEndsAt(ends)
                .build();
    }
}
