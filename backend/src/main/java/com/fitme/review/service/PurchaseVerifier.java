package com.fitme.review.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * "Đã mua hàng" badge: the reviewer clicked through to the brand's store for the product and either confirmed the
 * purchase themselves (buy_click_events.purchased_confirmed) or the brand ticked their lead as sold
 * (brand_leads.confirmed_sold_at). FitMe no longer sells on-site, so these are the only purchase signals available.
 */
@Component
@RequiredArgsConstructor
public class PurchaseVerifier {

    private static final String CONFIRMED_BUYERS_SQL = """
            SELECT user_id FROM buy_click_events
            WHERE product_id = ? AND purchased_confirmed = TRUE AND user_id IS NOT NULL
            UNION
            SELECT user_id FROM brand_leads
            WHERE product_id = ? AND confirmed_sold_at IS NOT NULL AND user_id IS NOT NULL
            """;

    private final JdbcTemplate jdbcTemplate;

    /** SQL predicate on a review-like row exposing {@code product_id} and {@code user_id} under {@code alias}. */
    public static String verifiedPurchaseSql(String alias) {
        return """
                (EXISTS (SELECT 1 FROM buy_click_events b
                         WHERE b.product_id = %1$s.product_id AND b.user_id = %1$s.user_id
                           AND b.purchased_confirmed = TRUE)
                 OR EXISTS (SELECT 1 FROM brand_leads bl
                            WHERE bl.product_id = %1$s.product_id AND bl.user_id = %1$s.user_id
                              AND bl.confirmed_sold_at IS NOT NULL))
                """.formatted(alias);
    }

    public Set<UUID> confirmedBuyers(UUID productId) {
        return new HashSet<>(jdbcTemplate.queryForList(CONFIRMED_BUYERS_SQL, UUID.class, productId, productId));
    }

    public boolean hasConfirmedPurchase(UUID userId, UUID productId) {
        if (userId == null) {
            return false;
        }
        Boolean confirmed = jdbcTemplate.queryForObject(
                "SELECT " + verifiedPurchaseSql("r") + " FROM (SELECT ?::uuid AS product_id, ?::uuid AS user_id) r",
                Boolean.class, productId, userId);
        return Boolean.TRUE.equals(confirmed);
    }
}
