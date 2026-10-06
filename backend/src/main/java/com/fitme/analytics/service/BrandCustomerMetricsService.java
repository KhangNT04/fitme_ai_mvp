package com.fitme.analytics.service;

import com.fitme.analytics.dto.BrandDashboardResponse.CustomerFunnel;
import com.fitme.analytics.dto.BrandDashboardResponse.ProductCustomers;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Types;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Brand dashboard customer metrics. A customer is the signed-in user, else the anonymous session. Try-ons come from
 * TRY_ON_GENERATED events, which list every brand / product of the outfit in metadata (brandIds / productIds).
 * analytics_events and buy_click_events store UTC in TIMESTAMP columns; brand_leads uses TIMESTAMPTZ.
 */
@Service
@RequiredArgsConstructor
public class BrandCustomerMetricsService {

    static final int TOP_PRODUCTS = 10;

    private static final String BRAND_TRY_ONS = " e.event_type = 'TRY_ON_GENERATED' AND e.created_at >= :since30"
            + " AND (e.brand_id = :brand OR e.metadata -> 'brandIds' @> jsonb_build_array(CAST(:brandText AS text)))\n";

    private final NamedParameterJdbcTemplate jdbc;
    private final AppClock clock;

    public record Snapshot(long tryOnCustomers7d, long tryOnCustomers30d, List<ProductCustomers> topProducts,
                           CustomerFunnel funnel30d) {
    }

    public Snapshot forBrand(UUID brandId) {
        Instant now = clock.now();
        Instant since30 = now.minus(30, ChronoUnit.DAYS);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("brand", brandId, Types.OTHER)
                .addValue("brandText", brandId.toString())
                .addValue("since7", utcTimestamp(now.minus(7, ChronoUnit.DAYS)))
                .addValue("since30", utcTimestamp(since30))
                .addValue("since30tz", since30.atOffset(ZoneOffset.UTC))
                .addValue("limit", TOP_PRODUCTS);

        Snapshot counts = jdbc.queryForObject("""
                WITH tries AS (
                    SELECT COALESCE(e.user_id, e.session_id) AS customer, e.created_at
                    FROM analytics_events e
                    WHERE """ + BRAND_TRY_ONS + """
                )
                SELECT (SELECT COUNT(DISTINCT customer) FROM tries WHERE created_at >= :since7) AS try7,
                       (SELECT COUNT(DISTINCT customer) FROM tries) AS try30,
                       (SELECT COUNT(DISTINCT COALESCE(b.user_id, b.session_id))
                        FROM buy_click_events b
                        JOIN products p ON p.id = b.product_id
                        WHERE p.brand_id = :brand AND b.created_at >= :since30) AS clicks30,
                       (SELECT COUNT(*) FROM brand_leads l
                        WHERE l.brand_id = :brand AND l.created_at >= :since30tz
                          AND l.confirmed_sold_at IS NOT NULL) AS sold30
                """, params, (rs, i) -> new Snapshot(rs.getLong("try7"), rs.getLong("try30"), List.of(),
                new CustomerFunnel(rs.getLong("try30"), rs.getLong("clicks30"), rs.getLong("sold30"))));

        List<ProductCustomers> top = jdbc.query("""
                SELECT p.id, p.name, COUNT(DISTINCT COALESCE(e.user_id, e.session_id)) AS customers
                FROM analytics_events e
                CROSS JOIN LATERAL jsonb_array_elements_text(
                    CASE WHEN jsonb_typeof(e.metadata -> 'productIds') = 'array'
                         THEN e.metadata -> 'productIds' ELSE '[]'::jsonb END) AS item(product_id)
                JOIN products p ON p.id = CAST(item.product_id AS uuid)
                WHERE p.brand_id = :brand AND """ + BRAND_TRY_ONS + """
                GROUP BY p.id, p.name
                HAVING COUNT(DISTINCT COALESCE(e.user_id, e.session_id)) > 0
                ORDER BY customers DESC, p.name
                LIMIT :limit
                """, params, (rs, i) -> new ProductCustomers(
                rs.getObject("id", UUID.class), rs.getString("name"), rs.getLong("customers")));

        return new Snapshot(counts.tryOnCustomers7d(), counts.tryOnCustomers30d(), top, counts.funnel30d());
    }

    private static LocalDateTime utcTimestamp(Instant instant) {
        return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
    }
}
