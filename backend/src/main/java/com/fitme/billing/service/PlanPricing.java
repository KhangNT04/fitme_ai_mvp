package com.fitme.billing.service;

import com.fitme.billing.entity.BillingPlan;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

/**
 * Effective price of a plan at a point in time. A discount applies only when {@code discountPercent > 0}
 * and {@code now} lies within [{@code discountStartsAt}, {@code discountEndsAt}]; a null bound is open.
 */
public final class PlanPricing {

    private PlanPricing() {
    }

    public static boolean isDiscountActive(BillingPlan plan, Instant now) {
        Integer percent = plan.getDiscountPercent();
        if (percent == null || percent <= 0) {
            return false;
        }
        Instant starts = plan.getDiscountStartsAt();
        Instant ends = plan.getDiscountEndsAt();
        return (starts == null || !now.isBefore(starts)) && (ends == null || !now.isAfter(ends));
    }

    /** Percent actually applied at {@code now} (0 when no discount is active). */
    public static int appliedDiscountPercent(BillingPlan plan, Instant now) {
        return isDiscountActive(plan, now) ? Math.min(plan.getDiscountPercent(), 100) : 0;
    }

    /** List price minus the active discount, rounded half-up to whole VND. */
    public static long effectivePrice(BillingPlan plan, Instant now) {
        return discounted(plan.getPriceVnd(), appliedDiscountPercent(plan, now));
    }

    public static long discounted(long listPriceVnd, int percent) {
        if (percent <= 0) {
            return listPriceVnd;
        }
        return BigDecimal.valueOf(listPriceVnd)
                .multiply(BigDecimal.valueOf(100L - percent))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                .longValueExact();
    }
}
