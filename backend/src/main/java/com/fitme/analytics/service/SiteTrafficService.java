package com.fitme.analytics.service;

import com.fitme.analytics.dto.TrafficStatsResponse;
import com.fitme.analytics.dto.TrafficStatsResponse.Assessment;
import com.fitme.analytics.dto.TrafficStatsResponse.BucketPoint;
import com.fitme.analytics.dto.TrafficStatsResponse.DailyPoint;
import com.fitme.analytics.dto.TrafficStatsResponse.Level;
import com.fitme.analytics.dto.TrafficStatsResponse.Period;
import com.fitme.analytics.dto.TrafficStatsResponse.Scale;
import com.fitme.analytics.dto.TrafficStatsResponse.Trend;
import com.fitme.analytics.dto.TrafficStatsResponse.Volatility;
import com.fitme.analytics.dto.TrafficStatsResponse.WeekdayPoint;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/** Records website visits (one row per browser per day) and builds the admin traffic report. */
@Service
@RequiredArgsConstructor
public class SiteTrafficService {

    public static final int MIN_RANGE_DAYS = 7;
    public static final int MAX_RANGE_DAYS = 90;
    private static final int ASSESSMENT_DAYS = 30;
    private static final int TREND_WINDOW_DAYS = 7;
    private static final int WEEKDAY_WINDOW_DAYS = 28;
    private static final int BUCKETS = 12;
    private static final Pattern BOT_AGENT = Pattern.compile(
            "bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests",
            Pattern.CASE_INSENSITIVE);
    private static final Logger log = LoggerFactory.getLogger(SiteTrafficService.class);

    private final JdbcTemplate jdbc;
    private final AppClock clock;

    public static boolean isBot(String userAgent) {
        return userAgent == null || userAgent.isBlank() || BOT_AGENT.matcher(userAgent).find();
    }

    /** Best-effort: a failed write must never break page navigation. */
    public void recordVisit(UUID visitorId, UUID userId) {
        Timestamp now = utc(clock.now());
        try {
            jdbc.update("""
                    INSERT INTO site_visits (visit_date, visitor_id, user_id, page_views, first_seen_at, last_seen_at)
                    VALUES (?, ?, ?, 1, ?, ?)
                    ON CONFLICT (visit_date, visitor_id) DO UPDATE
                    SET page_views = LEAST(site_visits.page_views + 1, 100000),
                        last_seen_at = EXCLUDED.last_seen_at,
                        user_id = COALESCE(EXCLUDED.user_id, site_visits.user_id)
                    """, clock.today(), visitorId, userId, now, now);
        } catch (DataAccessException ex) {
            log.debug("Could not record visit: {}", ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public TrafficStatsResponse stats(int requestedDays) {
        int days = Math.min(Math.max(requestedDays, MIN_RANGE_DAYS), MAX_RANGE_DAYS);
        LocalDate today = clock.today();
        int span = Math.max(days, ASSESSMENT_DAYS + 1);
        List<DailyPoint> series = daily(today.minusDays(span - 1L), today);

        Instant now = clock.now();
        Duration elapsedToday = Duration.between(clock.startOfDay(today), now);
        Timestamp sameTimeYesterday = utc(clock.startOfDay(today.minusDays(1)).plus(elapsedToday));
        DailyPoint todayPoint = series.getLast();
        long yesterdaySoFar = count("SELECT COUNT(*) FROM site_visits WHERE visit_date = ? AND first_seen_at <= ?",
                today.minusDays(1), sameTimeYesterday);
        Period day = new Period(todayPoint.visitors(), todayPoint.pageViews(), todayPoint.newVisitors(),
                yesterdaySoFar, changePct(todayPoint.visitors(), yesterdaySoFar));

        List<DailyPoint> complete = series.subList(series.size() - 1 - ASSESSMENT_DAYS, series.size() - 1);
        List<WeekdayPoint> weekdays = weekdays(complete);
        LocalDate monthFrom = today.minusDays(ASSESSMENT_DAYS - 1L);
        return new TrafficStatsResponse(today, days, day,
                period(today.minusDays(6), today, today.minusDays(13), today.minusDays(7)),
                period(monthFrom, today, today.minusDays(59), today.minusDays(30)),
                List.copyOf(series.subList(series.size() - days, series.size())),
                weekly(today),
                monthly(today),
                weekdays,
                assess(complete, todayPoint, weekdays, returning(monthFrom, today)));
    }

    /**
     * Pure rules behind the "đánh giá" card. {@code complete} holds the last 30 complete days (oldest first,
     * excluding today); {@code returning} = [visitors, returning visitors, visits, page views] over 30 days.
     */
    static Assessment assess(List<DailyPoint> complete, DailyPoint today, List<WeekdayPoint> weekdays,
                             long[] returning) {
        int n = complete.size();
        double total = complete.stream().mapToLong(DailyPoint::visitors).sum();
        double avg = n == 0 ? 0 : total / n;
        long last7 = sumVisitors(complete, n - TREND_WINDOW_DAYS, n);
        long prev7 = sumVisitors(complete, n - 2 * TREND_WINDOW_DAYS, n - TREND_WINDOW_DAYS);
        double recentAvg = last7 / (double) TREND_WINDOW_DAYS;

        Trend trend;
        Double trendPct = changePct(last7, prev7);
        if (last7 == 0 && prev7 == 0) {
            trend = Trend.NO_DATA;
        } else if (prev7 == 0 || trendPct >= 20) {
            trend = Trend.STRONG_UP;
        } else if (trendPct >= 5) {
            trend = Trend.UP;
        } else if (trendPct <= -20) {
            trend = Trend.STRONG_DOWN;
        } else if (trendPct <= -5) {
            trend = Trend.DOWN;
        } else {
            trend = Trend.STABLE;
        }

        Level level;
        if (avg == 0) {
            level = Level.NO_DATA;
        } else if (recentAvg >= avg * 1.25) {
            level = Level.HIGH;
        } else if (recentAvg >= avg * 0.75) {
            level = Level.NORMAL;
        } else {
            level = Level.LOW;
        }

        Scale scale = avg < 10 ? Scale.VERY_LOW : avg < 50 ? Scale.LOW : avg < 200 ? Scale.MEDIUM
                : avg < 1000 ? Scale.GOOD : Scale.HIGH;

        double variance = 0;
        for (DailyPoint point : complete) {
            variance += Math.pow(point.visitors() - avg, 2);
        }
        double cv = avg == 0 || n == 0 ? 0 : Math.sqrt(variance / n) / avg;
        Volatility volatility = cv < 0.35 ? Volatility.STABLE : cv < 0.7 ? Volatility.MODERATE : Volatility.HIGH;

        DailyPoint peak = today;
        for (DailyPoint point : complete) {
            if (point.visitors() > peak.visitors()) {
                peak = point;
            }
        }
        Integer busiest = null;
        double busiestAvg = 0;
        for (WeekdayPoint point : weekdays) {
            if (point.avgVisitors() > busiestAvg) {
                busiestAvg = point.avgVisitors();
                busiest = point.isoDay();
            }
        }

        return new Assessment(trend, trendPct, level, scale, volatility, round(avg), round(recentAvg),
                peak.visitors() > 0 ? peak.date() : null, peak.visitors(), busiest,
                returning[0] == 0 ? 0 : round((double) returning[1] / returning[0]),
                returning[2] == 0 ? 0 : round((double) returning[3] / returning[2]));
    }

    private List<DailyPoint> daily(LocalDate from, LocalDate to) {
        Map<LocalDate, DailyPoint> rows = new HashMap<>();
        jdbc.query("""
                SELECT v.visit_date, COUNT(*) AS visitors, COALESCE(SUM(v.page_views), 0) AS views,
                       COUNT(*) FILTER (WHERE f.first_date = v.visit_date) AS new_visitors
                FROM site_visits v
                JOIN (SELECT visitor_id, MIN(visit_date) AS first_date FROM site_visits
                      WHERE visitor_id IN (SELECT visitor_id FROM site_visits WHERE visit_date BETWEEN ? AND ?)
                      GROUP BY visitor_id) f ON f.visitor_id = v.visitor_id
                WHERE v.visit_date BETWEEN ? AND ?
                GROUP BY v.visit_date
                """, rs -> {
            LocalDate date = rs.getObject("visit_date", LocalDate.class);
            rows.put(date, new DailyPoint(date, rs.getLong("visitors"), rs.getLong("views"), rs.getLong("new_visitors")));
        }, from, to, from, to);
        List<DailyPoint> points = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            points.add(rows.getOrDefault(date, new DailyPoint(date, 0, 0, 0)));
        }
        return points;
    }

    private Period period(LocalDate from, LocalDate to, LocalDate previousFrom, LocalDate previousTo) {
        Map<String, Object> current = jdbc.queryForMap(
                "SELECT COUNT(DISTINCT visitor_id) AS visitors, COALESCE(SUM(page_views), 0) AS views "
                        + "FROM site_visits WHERE visit_date BETWEEN ? AND ?", from, to);
        long previous = count("SELECT COUNT(DISTINCT visitor_id) FROM site_visits WHERE visit_date BETWEEN ? AND ?",
                previousFrom, previousTo);
        long newVisitors = count("SELECT COUNT(*) FROM (SELECT visitor_id FROM site_visits GROUP BY visitor_id "
                + "HAVING MIN(visit_date) BETWEEN ? AND ?) f", from, to);
        long visitors = asLong(current.get("visitors"));
        return new Period(visitors, asLong(current.get("views")), newVisitors, previous, changePct(visitors, previous));
    }

    private List<BucketPoint> weekly(LocalDate today) {
        LocalDate from = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(BUCKETS - 1L);
        Map<LocalDate, BucketPoint> rows = buckets("week", from);
        List<BucketPoint> points = new ArrayList<>();
        for (int i = 0; i < BUCKETS; i++) {
            LocalDate start = from.plusWeeks(i);
            points.add(rows.getOrDefault(start, new BucketPoint(start, 0, 0)));
        }
        return points;
    }

    private List<BucketPoint> monthly(LocalDate today) {
        LocalDate from = today.withDayOfMonth(1).minusMonths(BUCKETS - 1L);
        Map<LocalDate, BucketPoint> rows = buckets("month", from);
        List<BucketPoint> points = new ArrayList<>();
        for (int i = 0; i < BUCKETS; i++) {
            LocalDate start = from.plusMonths(i);
            points.add(rows.getOrDefault(start, new BucketPoint(start, 0, 0)));
        }
        return points;
    }

    private Map<LocalDate, BucketPoint> buckets(String unit, LocalDate from) {
        Map<LocalDate, BucketPoint> rows = new HashMap<>();
        jdbc.query("SELECT CAST(date_trunc('" + unit + "', visit_date) AS DATE) AS bucket, "
                        + "COUNT(DISTINCT visitor_id) AS visitors, COALESCE(SUM(page_views), 0) AS views "
                        + "FROM site_visits WHERE visit_date >= ? GROUP BY 1",
                rs -> {
                    LocalDate start = rs.getObject("bucket", LocalDate.class);
                    rows.put(start, new BucketPoint(start, rs.getLong("visitors"), rs.getLong("views")));
                }, from);
        return rows;
    }

    private static List<WeekdayPoint> weekdays(List<DailyPoint> complete) {
        long[] sums = new long[8];
        int[] counts = new int[8];
        for (DailyPoint point : complete.subList(Math.max(0, complete.size() - WEEKDAY_WINDOW_DAYS), complete.size())) {
            int iso = point.date().getDayOfWeek().getValue();
            sums[iso] += point.visitors();
            counts[iso]++;
        }
        List<WeekdayPoint> points = new ArrayList<>();
        for (int iso = 1; iso <= 7; iso++) {
            points.add(new WeekdayPoint(iso, counts[iso] == 0 ? 0 : round((double) sums[iso] / counts[iso])));
        }
        return points;
    }

    private long[] returning(LocalDate from, LocalDate to) {
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT COUNT(*) AS visitors, COUNT(*) FILTER (WHERE days >= 2) AS returning,
                       COALESCE(SUM(days), 0) AS visits, COALESCE(SUM(views), 0) AS views
                FROM (SELECT visitor_id, COUNT(*) AS days, SUM(page_views) AS views FROM site_visits
                      WHERE visit_date BETWEEN ? AND ? GROUP BY visitor_id) x
                """, from, to);
        return new long[]{asLong(row.get("visitors")), asLong(row.get("returning")),
                asLong(row.get("visits")), asLong(row.get("views"))};
    }

    private static long sumVisitors(List<DailyPoint> points, int from, int to) {
        long sum = 0;
        for (int i = Math.max(0, from); i < Math.max(0, to); i++) {
            sum += points.get(i).visitors();
        }
        return sum;
    }

    static Double changePct(long current, long previous) {
        if (previous == 0) {
            return null;
        }
        return Math.round((current - previous) * 1000.0 / previous) / 10.0;
    }

    private long count(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private static Timestamp utc(Instant instant) {
        return Timestamp.valueOf(LocalDateTime.ofInstant(instant, ZoneOffset.UTC));
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static long asLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0;
    }
}
