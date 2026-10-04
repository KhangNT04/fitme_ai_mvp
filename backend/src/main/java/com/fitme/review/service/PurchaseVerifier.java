package com.fitme.review.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * "Đã mua hàng" badge: the reviewer has a DELIVERED seller order containing the product.
 * Reads the commerce tables via SQL so reviews keep working on databases where the
 * commerce migration has not been applied yet (then nobody is verified).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PurchaseVerifier {

    private static final String TABLES_EXIST_SQL = """
            SELECT to_regclass('public.order_items') IS NOT NULL
               AND to_regclass('public.seller_orders') IS NOT NULL
               AND to_regclass('public.orders') IS NOT NULL
            """;

    private static final String DELIVERED_BUYERS_SQL = """
            SELECT DISTINCT o.user_id
            FROM order_items oi
            JOIN seller_orders so ON so.id = oi.seller_order_id
            JOIN orders o ON o.id = so.order_id
            WHERE oi.product_id = ? AND so.status = 'DELIVERED'
            """;

    private final JdbcTemplate jdbcTemplate;
    private volatile boolean tablesConfirmed;

    // REQUIRES_NEW: a failing query against the commerce tables must not abort the caller's transaction.
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Set<UUID> deliveredBuyers(UUID productId) {
        if (!commerceTablesExist()) {
            return Set.of();
        }
        try {
            return new HashSet<>(jdbcTemplate.queryForList(DELIVERED_BUYERS_SQL, UUID.class, productId));
        } catch (Exception ex) {
            log.warn("Purchase verification unavailable for product {}: {}", productId, ex.getMessage());
            return Set.of();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public boolean hasDeliveredPurchase(UUID userId, UUID productId) {
        return userId != null && deliveredBuyers(productId).contains(userId);
    }

    private boolean commerceTablesExist() {
        if (tablesConfirmed) {
            return true;
        }
        try {
            Boolean exists = jdbcTemplate.queryForObject(TABLES_EXIST_SQL, Boolean.class);
            tablesConfirmed = Boolean.TRUE.equals(exists);
        } catch (Exception ex) {
            log.warn("Could not check commerce tables: {}", ex.getMessage());
        }
        return tablesConfirmed;
    }
}
