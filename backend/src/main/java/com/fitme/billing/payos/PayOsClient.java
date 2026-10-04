package com.fitme.billing.payos;

public interface PayOsClient {

    PayOsPaymentLink createPaymentLink(long orderCode, long amountVnd, String description,
                                       String returnUrl, String cancelUrl);

    long verifyAndParseWebhook(String rawWebhookBody);
}
