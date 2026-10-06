package com.fitme.billing.payos;

/**
 * A verified PayOS webhook.
 *
 * @param paid      true only when PayOS reports a successful transaction (data.code == "00")
 * @param amountVnd amount actually transferred, or null when the payload does not carry it (mock)
 */
public record PayOsWebhookEvent(long orderCode, boolean paid, Long amountVnd) {

    public static final String SUCCESS_CODE = "00";
}
