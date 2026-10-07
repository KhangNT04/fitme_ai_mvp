package com.fitme.analytics.service;

import com.fitme.analytics.dto.RetentionMetricsResponse;
import com.fitme.analytics.dto.RetentionMetricsResponse.DayRetention;
import com.fitme.analytics.dto.RetentionMetricsResponse.FrequencyBucket;
import com.fitme.analytics.dto.RetentionMetricsResponse.TopUser;
import com.fitme.analytics.dto.RetentionMetricsResponse.WeeklyCohort;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Consumer (role USER) engagement and retention for the admin dashboard, built on {@code user_activity_days}
 * (one row per user per Asia/Ho_Chi_Minh day with an authenticated request). Signup day = VN date of
 * {@code user_accounts.created_at} (stored as UTC).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RetentionMetricsService {

    /** Classic "active exactly on day N after signup" horizons. */
    public static final List<Integer> RETENTION_DAYS = List.of(1, 7, 30);
    /** Each D-N cohort spans this many signup days, ending N + 1 days ago so day N is complete for everyone. */
    public static final int RETENTION_COHORT_DAYS = 30;
    public static final int COHORT_WEEKS = 8;
    public static final int ACTIVE_WINDOW_DAYS = 30;
    public static final int TOP_USERS_LIMIT = 20;

    static final List<FrequencyBucket> FREQUENCY_BUCKETS = List.of(
            new FrequencyBucket("1", "1 ngày", 1, 1, 0),
            new FrequencyBucket("2-3", "2–3 ngày", 2, 3, 0),
            new FrequencyBucket("4-7", "4–7 ngày", 4, 7, 0),
            new FrequencyBucket("8+", "Từ 8 ngày", 8, null, 0));

    private static final String VN_CREATED = "(u.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')";

    private final JdbcTemplate jdbc;
    private final AppClock clock;

    public RetentionMetricsResponse retention() {
        LocalDate today = clock.today();
        LocalDate windowStart = today.minusDays(ACTIVE_WINDOW_DAYS - 1L);

        Map<String, Object> active = jdbc.queryForMap("""
                SELECT COUNT(DISTINCT a.user_id) FILTER (WHERE a.activity_date = ?) AS dau,
                       COUNT(DISTINCT a.user_id) FILTER (WHERE a.activity_date >= ?) AS wau,
                       COUNT(DISTINCT a.user_id) AS mau
                FROM user_activity_days a JOIN user_accounts u ON u.id = a.user_id
                WHERE u.role = 'USER' AND a.activity_date BETWEEN ? AND ?
                """, today, today.minusDays(6), windowStart, today);
        long dau = asLong(active.get("dau"));
        long mau = asLong(active.get("mau"));

        Map<String, Object> inactive = jdbc.queryForMap("""
                WITH flags AS (
                    SELECT EXISTS (SELECT 1 FROM user_activity_days a
                                   WHERE a.user_id = u.id AND a.activity_date < ?) AS active_before,
                           EXISTS (SELECT 1 FROM user_activity_days a
                                   WHERE a.user_id = u.id AND a.activity_date BETWEEN ? AND ?) AS active_recently
                    FROM user_accounts u
                    WHERE u.role = 'USER' AND u.created_at < ?
                )
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE active_before AND NOT active_recently) AS inactive
                FROM flags
                """, windowStart, windowStart, today, utcStartOf(today.plusDays(1)));

        return new RetentionMetricsResponse(today, dau,
                asLong(active.get("wau")), mau, ratio(dau, mau),
                dayRetention(today),
                weeklyCohorts(today),
                frequency(windowStart, today),
                asLong(inactive.get("inactive")),
                asLong(inactive.get("total")),
                topUsers(windowStart, today));
    }

    private List<DayRetention> dayRetention(LocalDate today) {
        int maxDay = RETENTION_DAYS.stream().mapToInt(Integer::intValue).max().orElse(0);
        int minDay = RETENTION_DAYS.stream().mapToInt(Integer::intValue).min().orElse(0);
        String horizons = RETENTION_DAYS.stream().map(n -> "(" + n + ")").collect(Collectors.joining(", "));
        Map<Integer, long[]> counts = new HashMap<>();
        jdbc.query("""
                WITH signups AS (
                    SELECT u.id, %s::date AS signup_day
                    FROM user_accounts u
                    WHERE u.role = 'USER' AND u.created_at >= ? AND u.created_at < ?
                ),
                horizons(n) AS (VALUES %s)
                SELECT h.n, COUNT(s.id) AS cohort_size, COUNT(a.user_id) AS retained
                FROM horizons h
                LEFT JOIN signups s
                       ON s.signup_day BETWEEN CAST(? AS date) - h.n - %d AND CAST(? AS date) - h.n - 1
                LEFT JOIN user_activity_days a
                       ON a.user_id = s.id AND a.activity_date = s.signup_day + h.n
                GROUP BY h.n
                """.formatted(VN_CREATED, horizons, RETENTION_COHORT_DAYS),
                rs -> {
                    counts.put(rs.getInt("n"), new long[]{rs.getLong("retained"), rs.getLong("cohort_size")});
                },
                utcStartOf(today.minusDays(maxDay + (long) RETENTION_COHORT_DAYS)),
                utcStartOf(today.minusDays(minDay)),
                today, today);

        List<DayRetention> result = new ArrayList<>();
        for (int n : RETENTION_DAYS) {
            long[] c = counts.getOrDefault(n, new long[]{0, 0});
            result.add(new DayRetention(n, today.minusDays(n + (long) RETENTION_COHORT_DAYS),
                    today.minusDays(n + 1L), c[0], c[1], ratio(c[0], c[1])));
        }
        return result;
    }

    private List<WeeklyCohort> weeklyCohorts(LocalDate today) {
        LocalDate firstWeek = today.with(DayOfWeek.MONDAY).minusWeeks(COHORT_WEEKS - 1L);
        Object[] cohortArgs = {utcStartOf(firstWeek), utcStartOf(today.plusDays(1))};
        String cohort = """
                SELECT u.id, date_trunc('week', %s)::date AS week_start
                FROM user_accounts u
                WHERE u.role = 'USER' AND u.created_at >= ? AND u.created_at < ?
                """.formatted(VN_CREATED);

        Map<LocalDate, Long> sizes = new HashMap<>();
        jdbc.query("SELECT week_start, COUNT(*) AS n FROM (" + cohort + ") c GROUP BY week_start",
                rs -> {
                    sizes.put(rs.getObject("week_start", LocalDate.class), rs.getLong("n"));
                }, cohortArgs);

        Map<LocalDate, long[]> activeByWeek = new HashMap<>();
        jdbc.query("""
                WITH cohort AS (%s)
                SELECT c.week_start, (a.activity_date - c.week_start) / 7 AS week_index,
                       COUNT(DISTINCT c.id) AS n
                FROM cohort c JOIN user_activity_days a ON a.user_id = c.id
                WHERE a.activity_date >= c.week_start AND a.activity_date < c.week_start + ? AND a.activity_date <= ?
                GROUP BY 1, 2
                """.formatted(cohort),
                rs -> {
                    activeByWeek.computeIfAbsent(rs.getObject("week_start", LocalDate.class),
                            k -> new long[COHORT_WEEKS])[rs.getInt("week_index")] = rs.getLong("n");
                }, cohortArgs[0], cohortArgs[1], COHORT_WEEKS * 7, today);

        List<WeeklyCohort> result = new ArrayList<>();
        for (int w = 0; w < COHORT_WEEKS; w++) {
            LocalDate weekStart = firstWeek.plusWeeks(w);
            long size = sizes.getOrDefault(weekStart, 0L);
            long[] active = activeByWeek.getOrDefault(weekStart, new long[COHORT_WEEKS]);
            List<Long> activeUsers = new ArrayList<>();
            List<Double> rates = new ArrayList<>();
            for (int i = 0; i < COHORT_WEEKS; i++) {
                boolean reached = !weekStart.plusWeeks(i).isAfter(today);
                activeUsers.add(reached ? active[i] : null);
                rates.add(reached ? ratio(active[i], size) : null);
            }
            result.add(new WeeklyCohort(weekStart, size, activeUsers, rates));
        }
        return result;
    }

    private List<FrequencyBucket> frequency(LocalDate windowStart, LocalDate today) {
        Map<Integer, Long> usersByActiveDays = new HashMap<>();
        jdbc.query("""
                SELECT d.active_days, COUNT(*) AS n FROM (
                    SELECT a.user_id, COUNT(*) AS active_days
                    FROM user_activity_days a JOIN user_accounts u ON u.id = a.user_id
                    WHERE u.role = 'USER' AND a.activity_date BETWEEN ? AND ?
                    GROUP BY a.user_id
                ) d GROUP BY d.active_days
                """, rs -> {
            usersByActiveDays.put(rs.getInt("active_days"), rs.getLong("n"));
        }, windowStart, today);

        List<FrequencyBucket> result = new ArrayList<>();
        for (FrequencyBucket bucket : FREQUENCY_BUCKETS) {
            long users = usersByActiveDays.entrySet().stream()
                    .filter(e -> e.getKey() >= bucket.minDays()
                            && (bucket.maxDays() == null || e.getKey() <= bucket.maxDays()))
                    .mapToLong(Map.Entry::getValue)
                    .sum();
            result.add(new FrequencyBucket(bucket.key(), bucket.label(), bucket.minDays(), bucket.maxDays(), users));
        }
        return result;
    }

    private List<TopUser> topUsers(LocalDate windowStart, LocalDate today) {
        return jdbc.query("""
                WITH act AS (
                    SELECT a.user_id, u.email, COUNT(*) AS active_days, MAX(a.activity_date) AS last_active
                    FROM user_activity_days a JOIN user_accounts u ON u.id = a.user_id
                    WHERE u.role = 'USER' AND a.activity_date BETWEEN ? AND ?
                    GROUP BY a.user_id, u.email
                    ORDER BY active_days DESC, last_active DESC, u.email
                    LIMIT ?
                ),
                ev AS (
                    SELECT e.user_id,
                           COUNT(*) FILTER (WHERE e.event_type = 'RECOMMENDATION_GENERATED') AS recommendations,
                           COUNT(*) FILTER (WHERE e.event_type = 'TRY_ON_STARTED') AS try_ons,
                           COUNT(*) FILTER (WHERE e.event_type = 'BUY_CLICKED') AS buy_clicks
                    FROM analytics_events e JOIN act ON act.user_id = e.user_id
                    WHERE e.event_type IN ('RECOMMENDATION_GENERATED', 'TRY_ON_STARTED', 'BUY_CLICKED')
                      AND e.created_at >= ? AND e.created_at < ?
                    GROUP BY e.user_id
                )
                SELECT u.id, u.display_name, u.email, act.active_days, act.last_active,
                       COALESCE(ev.recommendations, 0) AS recommendations,
                       COALESCE(ev.try_ons, 0) AS try_ons,
                       COALESCE(ev.buy_clicks, 0) AS buy_clicks
                FROM act
                JOIN user_accounts u ON u.id = act.user_id
                LEFT JOIN ev ON ev.user_id = act.user_id
                ORDER BY act.active_days DESC, act.last_active DESC, u.email
                """, (rs, i) -> new TopUser(
                        rs.getObject("id", UUID.class),
                        rs.getString("display_name"),
                        rs.getString("email"),
                        rs.getObject("last_active", LocalDate.class),
                        rs.getLong("active_days"),
                        rs.getLong("recommendations"),
                        rs.getLong("try_ons"),
                        rs.getLong("buy_clicks")),
                windowStart, today, TOP_USERS_LIMIT, utcStartOf(windowStart), utcStartOf(today.plusDays(1)));
    }

    private static Timestamp utcStartOf(LocalDate localDay) {
        return Timestamp.valueOf(LocalDateTime.ofInstant(
                localDay.atStartOfDay(AppClock.BUSINESS_ZONE).toInstant(), ZoneOffset.UTC));
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0;
    }

    private static Double ratio(long part, long whole) {
        return whole == 0 ? null : Math.round(part * 1000.0 / whole) / 1000.0;
    }
}
