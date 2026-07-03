package com.fitme.billing.payos;

public interface PayOsClient {

    PayOsPaymentLink createPaymentLink(long orderCode, long amountVnd, String description);

    long verifyAndParseWebhook(String rawWebhookBody);
}
