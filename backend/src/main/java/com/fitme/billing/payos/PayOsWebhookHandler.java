package com.fitme.billing.payos;

/**
 * One PayOS account serves every payable flow (Pro subscription, commerce orders).
 * PayOS order codes are globally unique across flows, so the webhook controller asks
 * each handler in turn and stops at the first one that owns the code.
 */
public interface PayOsWebhookHandler {

    /**
     * Marks the matching order as paid (idempotently).
     *
     * @return true when this handler owns {@code orderCode}
     */
    boolean handlePaid(long orderCode);
}
