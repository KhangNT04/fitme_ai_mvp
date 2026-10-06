package com.fitme.analytics.service;

import com.fitme.analytics.dto.AdminMetricsResponse;
import com.fitme.analytics.dto.AdminMetricsResponse.Checkout;
import com.fitme.analytics.dto.AdminMetricsResponse.DailyPoint;
import com.fitme.analytics.dto.AdminMetricsResponse.FunnelStep;
import com.fitme.analytics.dto.AdminMetricsResponse.Revenue;
import com.fitme.analytics.dto.AdminMetricsResponse.SourceCount;
import com.fitme.analytics.dto.AdminMetricsResponse.Users;
import com.fitme.analytics.dto.PayingCustomersReport;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Growth / revenue metrics for the admin dashboard. Timestamps are stored as UTC; days are bucketed in
 * Asia/Ho_Chi_Minh. Only consumer accounts (role USER) count as users.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminMetricsService {

    public static final int MIN_RANGE_DAYS = 7;
    public static final int MAX_RANGE_DAYS = 90;

    private static final String VN_DAY = "(%s AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date";
    private static final String CONSUMER = "u.role = 'USER'";
    private static final String PAID_USER_IDS = "SELECT user_id FROM consumer_billing_orders WHERE status = 'PAID'";

    private final JdbcTemplate jdbc;
    private final AppClock clock;
    private final FitMeProperties properties;

    public long activeUsersSince(int daysBack) {
        LocalDate from = today().minusDays(Math.max(daysBack, 1) - 1L);
        return count("SELECT COUNT(DISTINCT a.user_id) FROM user_activity_days a JOIN user_accounts u ON u.id = a.user_id "
                + "WHERE " + CONSUMER + " AND a.activity_date >= ?", from);
    }

    public long totalConsumers() {
        return count("SELECT COUNT(*) FROM user_accounts u WHERE " + CONSUMER);
    }

    public AdminMetricsResponse metrics(int requestedDays) {
        int days = Math.min(Math.max(requestedDays, MIN_RANGE_DAYS), MAX_RANGE_DAYS);
        LocalDate to = today();
        LocalDate from = to.minusDays(days - 1L);
        Timestamp fromUtc = utcStartOf(from);

        return new AdminMetricsResponse(days, from, to,
                users(fromUtc),
                revenue(fromUtc),
                checkout(fromUtc),
                funnel(fromUtc),
                daily(from, to, fromUtc),
                signupSources(fromUtc));
    }

    public PayingCustomersReport payingCustomers() {
        List<PayingCustomersReport.Row> rows = jdbc.query("""
                SELECT 'PREMIUM_SUBSCRIPTION' AS kind, b.id, CAST(b.payos_order_code AS VARCHAR) AS reference,
                       b.payos_order_code, b.amount_vnd AS amount, b.paid_at, u.id AS user_id,
                       u.display_name AS customer_name, u.email,
                       COALESCE(b.payos_payment_link_id LIKE 'mock-%', FALSE) AS mock
                FROM consumer_billing_orders b JOIN user_accounts u ON u.id = b.user_id
                WHERE b.status = 'PAID'
                ORDER BY b.paid_at DESC NULLS LAST
                """, (rs, i) -> {
            Timestamp paidAt = rs.getTimestamp("paid_at");
            long payosCode = rs.getLong("payos_order_code");
            Long payosOrderCode = rs.wasNull() ? null : payosCode;
            return new PayingCustomersReport.Row(
                    PayingCustomersReport.Kind.valueOf(rs.getString("kind")),
                    rs.getObject("id", UUID.class),
                    rs.getString("reference"),
                    payosOrderCode,
                    rs.getLong("amount"),
                    paidAt == null ? null : paidAt.toLocalDateTime().toInstant(ZoneOffset.UTC),
                    rs.getObject("user_id", UUID.class),
                    rs.getString("customer_name"),
                    rs.getString("email"),
                    rs.getBoolean("mock"));
        });

        Set<UUID> customers = new HashSet<>();
        long total = 0;
        long mockCount = 0;
        long liveRevenue = 0;
        for (PayingCustomersReport.Row row : rows) {
            customers.add(row.userId());
            total += row.amountVnd();
            if (row.mock()) {
                mockCount++;
            } else {
                liveRevenue += row.amountVnd();
            }
        }
        return new PayingCustomersReport(customers.size(), rows.size(), total, mockCount, liveRevenue,
                properties.getPayos().isMock(), rows);
    }

    /** UTF-8 (with BOM so Excel detects the encoding) CSV of {@link #payingCustomers()}. */
    public byte[] payingCustomersCsv() {
        DateTimeFormatter format = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append("Thời gian thanh toán (GMT+7),Loại giao dịch,Mã tham chiếu,Mã PayOS,Số tiền (VND),")
                .append("Khách hàng,Email,Giả lập (mock)\n");
        for (PayingCustomersReport.Row row : payingCustomers().rows()) {
            csv.append(row.paidAt() == null ? "" : format.format(row.paidAt().atZone(AppClock.BUSINESS_ZONE)))
                    .append(',').append(kindLabel(row.kind()))
                    .append(',').append(csvCell(row.reference()))
                    .append(',').append(row.payosOrderCode() == null ? "" : row.payosOrderCode())
                    .append(',').append(row.amountVnd())
                    .append(',').append(csvCell(row.customerName()))
                    .append(',').append(csvCell(row.email()))
                    .append(',').append(row.mock() ? "Có" : "Không")
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Users users(Timestamp fromUtc) {
        LocalDate today = today();
        String activeSince = "SELECT COUNT(DISTINCT a.user_id) FROM user_activity_days a "
                + "JOIN user_accounts u ON u.id = a.user_id WHERE " + CONSUMER + " AND a.activity_date >= ?";
        return new Users(
                totalConsumers(),
                count("SELECT COUNT(*) FROM user_accounts u WHERE " + CONSUMER + " AND u.email_verified"),
                count("SELECT COUNT(*) FROM user_accounts u WHERE " + CONSUMER + " AND u.created_at >= ?", fromUtc),
                count(activeSince, today),
                count(activeSince, today.minusDays(6)),
                count(activeSince, today.minusDays(29)),
                count("SELECT COUNT(*) FROM (SELECT a.user_id FROM user_activity_days a "
                        + "JOIN user_accounts u ON u.id = a.user_id WHERE " + CONSUMER + " AND a.activity_date >= ? "
                        + "GROUP BY a.user_id HAVING COUNT(*) >= 2) r", today.minusDays(29)));
    }

    private Revenue revenue(Timestamp fromUtc) {
        Timestamp nowUtc = Timestamp.valueOf(LocalDateTime.ofInstant(clock.now(), ZoneOffset.UTC));
        return new Revenue(
                count("SELECT COUNT(*) FROM (" + PAID_USER_IDS + ") p"),
                count("SELECT COUNT(DISTINCT user_id) FROM consumer_billing_orders "
                        + "WHERE status = 'PAID' AND paid_at >= ?", fromUtc),
                count("SELECT COUNT(*) FROM consumer_billing_orders WHERE status = 'PAID' AND paid_at >= ?", fromUtc),
                count("SELECT COALESCE(SUM(amount_vnd), 0) FROM consumer_billing_orders "
                        + "WHERE status = 'PAID' AND paid_at >= ?", fromUtc),
                count("SELECT COUNT(*) FROM consumer_subscriptions WHERE status = 'ACTIVE' AND expires_at > ?",
                        nowUtc));
    }

    private Checkout checkout(Timestamp fromUtc) {
        Map<String, Object> premium = jdbc.queryForMap("""
                SELECT COUNT(*) AS started, COUNT(*) FILTER (WHERE status = 'PAID') AS paid
                FROM consumer_billing_orders WHERE created_at >= ?
                """, fromUtc);
        long premiumStarted = asLong(premium.get("started"));
        long premiumPaid = asLong(premium.get("paid"));
        return new Checkout(premiumStarted, premiumPaid, ratio(premiumPaid, premiumStarted));
    }

    private List<FunnelStep> funnel(Timestamp fromUtc) {
        Map<String, Object> row = jdbc.queryForMap("""
                WITH cohort AS (
                    SELECT u.id, u.email_verified FROM user_accounts u
                    WHERE u.role = 'USER' AND u.created_at >= ?
                ),
                flags AS (
                    SELECT c.id, c.email_verified,
                           EXISTS (SELECT 1 FROM try_on_requests t WHERE t.user_id = c.id)
                               OR EXISTS (SELECT 1 FROM recommendations r WHERE r.user_id = c.id) AS used_ai,
                           EXISTS (SELECT 1 FROM consumer_billing_orders b WHERE b.user_id = c.id) AS checkout,
                           c.id IN (%s) AS paid
                    FROM cohort c
                )
                SELECT COUNT(*) AS signed_up,
                       COUNT(*) FILTER (WHERE email_verified) AS verified,
                       COUNT(*) FILTER (WHERE used_ai) AS used_ai,
                       COUNT(*) FILTER (WHERE checkout) AS checkout,
                       COUNT(*) FILTER (WHERE paid) AS paid
                FROM flags
                """.formatted(PAID_USER_IDS), fromUtc);
        return List.of(
                new FunnelStep("signed_up", "Đăng ký", asLong(row.get("signed_up"))),
                new FunnelStep("verified", "Xác minh email", asLong(row.get("verified"))),
                new FunnelStep("used_ai", "Dùng tư vấn / thử đồ AI", asLong(row.get("used_ai"))),
                new FunnelStep("checkout", "Bắt đầu thanh toán gói Premium", asLong(row.get("checkout"))),
                new FunnelStep("paid", "Đã thanh toán", asLong(row.get("paid"))));
    }

    private List<DailyPoint> daily(LocalDate from, LocalDate to, Timestamp fromUtc) {
        Map<LocalDate, Long> signups = countsByDay("SELECT " + VN_DAY.formatted("u.created_at")
                + " AS day, COUNT(*) AS n FROM user_accounts u WHERE " + CONSUMER + " AND u.created_at >= ? GROUP BY 1",
                fromUtc);
        Map<LocalDate, Long> active = countsByDay("SELECT a.activity_date AS day, COUNT(*) AS n "
                + "FROM user_activity_days a JOIN user_accounts u ON u.id = a.user_id "
                + "WHERE " + CONSUMER + " AND a.activity_date >= ? GROUP BY 1", from);
        Map<LocalDate, Long> tryOns = countsByDay("SELECT " + VN_DAY.formatted("created_at")
                + " AS day, COUNT(*) AS n FROM analytics_events "
                + "WHERE event_type = 'TRY_ON_STARTED' AND created_at >= ? GROUP BY 1", fromUtc);

        Map<LocalDate, long[]> paid = new HashMap<>();
        jdbc.query("SELECT " + VN_DAY.formatted("paid_at") + " AS day, COUNT(*) AS n, "
                        + "COALESCE(SUM(amount_vnd), 0) AS revenue "
                        + "FROM consumer_billing_orders WHERE status = 'PAID' AND paid_at >= ? GROUP BY 1",
                rs -> {
                    paid.put(rs.getObject("day", LocalDate.class),
                            new long[]{rs.getLong("n"), rs.getLong("revenue")});
                }, fromUtc);

        List<DailyPoint> points = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            long[] p = paid.getOrDefault(day, new long[]{0, 0});
            points.add(new DailyPoint(day, signups.getOrDefault(day, 0L), active.getOrDefault(day, 0L),
                    tryOns.getOrDefault(day, 0L), p[0], p[1]));
        }
        return points;
    }

    private List<SourceCount> signupSources(Timestamp fromUtc) {
        return jdbc.query("""
                SELECT COALESCE(NULLIF(u.signup_source, ''), '(trực tiếp)') AS source,
                       COUNT(*) AS users,
                       COUNT(*) FILTER (WHERE u.id IN (%s)) AS paying
                FROM user_accounts u
                WHERE u.role = 'USER' AND u.created_at >= ?
                GROUP BY 1 ORDER BY 2 DESC LIMIT 10
                """.formatted(PAID_USER_IDS),
                (rs, i) -> new SourceCount(rs.getString("source"), rs.getLong("users"), rs.getLong("paying")),
                fromUtc);
    }

    private Map<LocalDate, Long> countsByDay(String sql, Object arg) {
        Map<LocalDate, Long> result = new HashMap<>();
        jdbc.query(sql, rs -> {
            result.put(rs.getObject("day", LocalDate.class), rs.getLong("n"));
        }, arg);
        return result;
    }

    private long count(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0 : value;
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.now(), AppClock.BUSINESS_ZONE);
    }

    private static Timestamp utcStartOf(LocalDate localDay) {
        return Timestamp.valueOf(LocalDateTime.ofInstant(
                localDay.atStartOfDay(AppClock.BUSINESS_ZONE).toInstant(), ZoneOffset.UTC));
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0;
    }

    private static double ratio(long part, long whole) {
        return whole == 0 ? 0 : Math.round(part * 1000.0 / whole) / 1000.0;
    }

    private static String kindLabel(PayingCustomersReport.Kind kind) {
        return switch (kind) {
            case PREMIUM_SUBSCRIPTION -> "Gói FitMe Premium";
        };
    }

    private static String csvCell(String value) {
        if (value == null) {
            return "";
        }
        String safe = value;
        if (!safe.isEmpty() && "=+-@".indexOf(safe.charAt(0)) >= 0) {
            safe = "'" + safe;
        }
        if (safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r")) {
            return "\"" + safe.replace("\"", "\"\"") + "\"";
        }
        return safe;
    }
}
