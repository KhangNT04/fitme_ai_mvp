package com.fitme.analytics.dto;

import java.time.LocalDate;
import java.util.List;

public record AdminMetricsResponse(
        int rangeDays,
        LocalDate fromDate,
        LocalDate toDate,
        Users users,
        Revenue revenue,
        Checkout checkout,
        List<FunnelStep> funnel,
        List<DailyPoint> daily,
        List<SourceCount> signupSources
) {

    public record Users(
            long totalUsers,
            long verifiedUsers,
            long newUsers,
            long dailyActive,
            long weeklyActive,
            long monthlyActive,
            /** Users active on at least two different days in the last 30 days. */
            long returningUsers30d
    ) {
    }

    public record Revenue(
            long payingUsersAllTime,
            long payingUsersInRange,
            long paidTransactionsInRange,
            long proRevenueVnd,
            long orderRevenueVnd,
            long activeProSubscribers
    ) {
    }

    public record Checkout(
            long orderCheckoutsStarted,
            long orderCheckoutsPaid,
            long orderCheckoutsAbandoned,
            double orderAbandonmentRate,
            long proCheckoutsStarted,
            long proCheckoutsPaid,
            double proConversionRate
    ) {
    }

    /** Users of the signup cohort (registered in range) who reached the step. */
    public record FunnelStep(String key, String label, long users) {
    }

    public record DailyPoint(
            LocalDate date,
            long signups,
            long activeUsers,
            long tryOns,
            long paidTransactions,
            long revenueVnd
    ) {
    }

    public record SourceCount(String source, long users, long payingUsers) {
    }
}
