package com.fitme.billing.payos;

/**
 * One PayOS account serves every payable flow (currently the consumer Pro subscription and Fitken top-ups).
 * PayOS order codes are globally unique across flows, so the webhook controller asks
 * each handler in turn and stops at the first one that owns the code.
 */
public interface PayOsWebhookHandler {

    /**
     * Marks the matching order as paid (idempotently). An order is left unpaid when
     * {@code amountVnd} is known and lower than the amount due.
     *
     * @return true when this handler owns {@code orderCode}
     */
    boolean handlePaid(long orderCode, Long amountVnd);
}
