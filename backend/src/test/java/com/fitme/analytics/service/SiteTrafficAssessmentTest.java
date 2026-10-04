package com.fitme.analytics.service;

import com.fitme.analytics.dto.TrafficStatsResponse.Assessment;
import com.fitme.analytics.dto.TrafficStatsResponse.DailyPoint;
import com.fitme.analytics.dto.TrafficStatsResponse.Level;
import com.fitme.analytics.dto.TrafficStatsResponse.Scale;
import com.fitme.analytics.dto.TrafficStatsResponse.Trend;
import com.fitme.analytics.dto.TrafficStatsResponse.Volatility;
import com.fitme.analytics.dto.TrafficStatsResponse.WeekdayPoint;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.IntUnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;

class SiteTrafficAssessmentTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 4);
    private static final long[] NO_RETURNING = {0, 0, 0, 0};

    @Test
    void noTrafficIsReportedAsNoData() {
        Assessment result = SiteTrafficService.assess(days(i -> 0), point(TODAY, 0), List.of(), NO_RETURNING);

        assertThat(result.trend()).isEqualTo(Trend.NO_DATA);
        assertThat(result.level()).isEqualTo(Level.NO_DATA);
        assertThat(result.scale()).isEqualTo(Scale.VERY_LOW);
        assertThat(result.peakDate()).isNull();
        assertThat(result.trendChangePct()).isNull();
    }

    @Test
    void growingTrafficIsStrongUpAndAboveAverage() {
        // 20 visitors/day for 23 days, then 40/day for the last 7 complete days.
        Assessment result = SiteTrafficService.assess(days(i -> i >= 23 ? 40 : 20), point(TODAY, 12),
                List.of(new WeekdayPoint(1, 25), new WeekdayPoint(6, 31)), new long[]{100, 25, 150, 450});

        assertThat(result.trend()).isEqualTo(Trend.STRONG_UP);
        assertThat(result.trendChangePct()).isEqualTo(100.0);
        assertThat(result.level()).isEqualTo(Level.HIGH);
        assertThat(result.scale()).isEqualTo(Scale.LOW);
        assertThat(result.recentAvgDailyVisitors()).isEqualTo(40.0);
        assertThat(result.peakVisitors()).isEqualTo(40);
        assertThat(result.busiestWeekday()).isEqualTo(6);
        assertThat(result.returningRate()).isEqualTo(0.25);
        assertThat(result.pagesPerVisit()).isEqualTo(3.0);
    }

    @Test
    void flatTrafficIsStableAndNormal() {
        Assessment result = SiteTrafficService.assess(days(i -> 300), point(TODAY, 100), List.of(), NO_RETURNING);

        assertThat(result.trend()).isEqualTo(Trend.STABLE);
        assertThat(result.trendChangePct()).isEqualTo(0.0);
        assertThat(result.level()).isEqualTo(Level.NORMAL);
        assertThat(result.scale()).isEqualTo(Scale.GOOD);
        assertThat(result.volatility()).isEqualTo(Volatility.STABLE);
    }

    @Test
    void droppingSpikyTrafficIsStrongDownAndVolatile() {
        // Alternating 0 / 100 for most of the month, then a quiet last week.
        Assessment result = SiteTrafficService.assess(days(i -> i >= 23 ? 5 : (i % 2 == 0 ? 100 : 0)),
                point(TODAY, 0), List.of(), NO_RETURNING);

        assertThat(result.trend()).isEqualTo(Trend.STRONG_DOWN);
        assertThat(result.level()).isEqualTo(Level.LOW);
        assertThat(result.volatility()).isEqualTo(Volatility.HIGH);
    }

    @Test
    void changePctIsNullWithoutABaseline() {
        assertThat(SiteTrafficService.changePct(5, 0)).isNull();
        assertThat(SiteTrafficService.changePct(15, 10)).isEqualTo(50.0);
        assertThat(SiteTrafficService.changePct(9, 12)).isEqualTo(-25.0);
    }

    @Test
    void botsAndEmptyAgentsAreIgnored() {
        assertThat(SiteTrafficService.isBot(null)).isTrue();
        assertThat(SiteTrafficService.isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).isTrue();
        assertThat(SiteTrafficService.isBot("Mozilla/5.0 HeadlessChrome/120.0")).isTrue();
        assertThat(SiteTrafficService.isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).isFalse();
    }

    private static List<DailyPoint> days(IntUnaryOperator visitorsByIndex) {
        List<DailyPoint> points = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            points.add(point(TODAY.minusDays(30L - i), visitorsByIndex.applyAsInt(i)));
        }
        return points;
    }

    private static DailyPoint point(LocalDate date, long visitors) {
        return new DailyPoint(date, visitors, visitors * 2, 0);
    }
}
