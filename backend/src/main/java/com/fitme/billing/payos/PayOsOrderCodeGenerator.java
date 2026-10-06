package com.fitme.billing.payos;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Issues PayOS order codes for every payable flow from the {@code payos_order_code_seq} sequence (V29),
 * so consumer and brand orders never share a code and {@link PayOsWebhookHandler}s cannot both claim one.
 */
@Component
@RequiredArgsConstructor
public class PayOsOrderCodeGenerator {

    private final JdbcTemplate jdbc;

    public long next() {
        Long code = jdbc.queryForObject("SELECT nextval('payos_order_code_seq')", Long.class);
        if (code == null) {
            throw new IllegalStateException("payos_order_code_seq returned no value");
        }
        return code;
    }
}
