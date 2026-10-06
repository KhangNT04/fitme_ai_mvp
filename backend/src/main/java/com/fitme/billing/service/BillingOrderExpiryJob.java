package com.fitme.billing.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Marks consumer and Brand Plus checkouts that were never paid as EXPIRED. A late PayOS webhook still activates the plan,
 * because the paid handlers only skip orders that are already PAID.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BillingOrderExpiryJob {

    private final JdbcTemplate jdbc;

    @Value("${fitme.billing.pending-expiry-hours:24}")
    private int pendingExpiryHours;

    @Scheduled(fixedDelay = 15 * 60_000, initialDelay = 60_000)
    @Transactional
    public int expireStalePendingOrders() {
        int expired = 0;
        for (String table : new String[]{"consumer_billing_orders", "brand_billing_orders"}) {
            expired += jdbc.update("UPDATE " + table + " SET status = 'EXPIRED', updated_at = NOW() "
                    + "WHERE status = 'PENDING' AND created_at < NOW() - make_interval(hours => ?)", pendingExpiryHours);
        }
        if (expired > 0) {
            log.info("[BILLING] Expired {} unpaid plan checkout(s) older than {}h", expired, pendingExpiryHours);
        }
        return expired;
    }
}
