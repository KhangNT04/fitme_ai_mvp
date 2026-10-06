package com.fitme.review.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * "Đã mua hàng" badge: the reviewer clicked through to the brand's store for the product and later
 * confirmed the purchase themselves (buy_click_events.purchased_confirmed). FitMe no longer sells on-site,
 * so this self-confirmation is the only purchase signal available.
 */
@Component
@RequiredArgsConstructor
public class PurchaseVerifier {

    private static final String CONFIRMED_BUYERS_SQL = """
            SELECT DISTINCT user_id
            FROM buy_click_events
            WHERE product_id = ? AND purchased_confirmed = TRUE AND user_id IS NOT NULL
            """;

    private final JdbcTemplate jdbcTemplate;

    public Set<UUID> confirmedBuyers(UUID productId) {
        return new HashSet<>(jdbcTemplate.queryForList(CONFIRMED_BUYERS_SQL, UUID.class, productId));
    }

    public boolean hasConfirmedPurchase(UUID userId, UUID productId) {
        if (userId == null) {
            return false;
        }
        Boolean confirmed = jdbcTemplate.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM buy_click_events
                               WHERE product_id = ? AND user_id = ? AND purchased_confirmed = TRUE)
                """, Boolean.class, productId, userId);
        return Boolean.TRUE.equals(confirmed);
    }
}
