package com.fitme.analytics.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Consumer engagement / retention snapshot; ratios are 0..1 and null when the denominator is zero. */
public record RetentionMetricsResponse(
        LocalDate today,
        long dau,
        long wau,
        long mau,
        Double stickiness,
        List<DayRetention> retention,
        List<WeeklyCohort> cohorts,
        List<FrequencyBucket> frequency,
        long inactive30d,
        long totalConsumers,
        List<TopUser> topUsers
) {

    /** Users whose signup day is in [cohortFrom, cohortTo] and who were active exactly on signup day + {@code day}. */
    public record DayRetention(
            int day,
            LocalDate cohortFrom,
            LocalDate cohortTo,
            long retained,
            long cohortSize,
            Double rate
    ) {
    }

    /** Index i of the lists is calendar week i after the signup week (0 = signup week); null = not reached yet. */
    public record WeeklyCohort(
            LocalDate weekStart,
            long size,
            List<Long> activeUsers,
            List<Double> rates
    ) {
    }

    public record FrequencyBucket(String key, String label, int minDays, Integer maxDays, long users) {
    }

    public record TopUser(
            UUID userId,
            String displayName,
            String email,
            LocalDate lastActiveDate,
            long activeDays30d,
            long recommendations30d,
            long tryOns30d,
            long buyClicks30d
    ) {
    }
}
