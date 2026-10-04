package com.fitme.analytics.dto;

import java.time.LocalDate;
import java.util.List;

/** Website visitors (unique browsers) and page views; days are Asia/Ho_Chi_Minh. */
public record TrafficStatsResponse(
        LocalDate today,
        int rangeDays,
        /** Today so far; previousVisitors = yesterday up to the same time of day. */
        Period day,
        /** Last 7 days including today vs the 7 days before. */
        Period week,
        /** Last 30 days including today vs the 30 days before. */
        Period month,
        List<DailyPoint> daily,
        List<BucketPoint> weekly,
        List<BucketPoint> monthly,
        List<WeekdayPoint> weekdays,
        Assessment assessment
) {

    public record Period(long visitors, long pageViews, long newVisitors, long previousVisitors, Double changePct) {
    }

    public record DailyPoint(LocalDate date, long visitors, long pageViews, long newVisitors) {
    }

    /** {@code start} is the Monday of the week or the first day of the month. */
    public record BucketPoint(LocalDate start, long visitors, long pageViews) {
    }

    /** Average daily visitors per ISO weekday (1 = Monday) over the last 4 complete weeks. */
    public record WeekdayPoint(int isoDay, double avgVisitors) {
    }

    public record Assessment(
            Trend trend,
            /** Last 7 complete days vs the 7 before; null when there is no earlier traffic to compare with. */
            Double trendChangePct,
            Level level,
            Scale scale,
            Volatility volatility,
            double avgDailyVisitors,
            double recentAvgDailyVisitors,
            LocalDate peakDate,
            long peakVisitors,
            Integer busiestWeekday,
            /** Share of last-30-day visitors who came back on at least two different days. */
            double returningRate,
            double pagesPerVisit
    ) {
    }

    public enum Trend { NO_DATA, STRONG_UP, UP, STABLE, DOWN, STRONG_DOWN }

    /** Last 7 complete days compared with the 30-day average. */
    public enum Level { NO_DATA, LOW, NORMAL, HIGH }

    /** Absolute size of the 30-day average daily visitors. */
    public enum Scale { VERY_LOW, LOW, MEDIUM, GOOD, HIGH }

    public enum Volatility { STABLE, MODERATE, HIGH }
}
