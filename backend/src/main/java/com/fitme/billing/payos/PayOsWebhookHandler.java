package com.fitme.billing.payos;

/**
 * One PayOS account serves every payable flow (consumer Premium / Fitken top-ups and brand Brand Plus).
 * PayOS order codes are globally unique across flows ({@link PayOsOrderCodeGenerator}), so the webhook
 * controller asks each handler in turn and stops at the first one that owns the code.
 */
public interface PayOsWebhookHandler {

    /**
     * Marks the matching order as paid (idempotently). An order is left unpaid when
     * {@code amountVnd} is known and lower than the amount due.
     *
     * @return true when this handler owns {@code orderCode}
     */
    boolean handlePaid(long orderCode, Long amountVnd);

    /**
     * A verified webhook reporting an unsuccessful transaction. Handlers that track failures mark a
     * still-pending order FAILED; a later successful webhook must still be able to mark it paid.
     *
     * @return true when this handler owns {@code orderCode}
     */
    default boolean handleUnpaid(long orderCode) {
        return false;
    }
}
