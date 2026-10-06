package com.fitme.billing.service;

import com.fitme.billing.payos.PayOsWebhookHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ConsumerSubscriptionWebhookHandler implements PayOsWebhookHandler {

    private final ConsumerSubscriptionService subscriptionService;

    @Override
    public boolean handlePaid(long orderCode, Long amountVnd) {
        return subscriptionService.handlePaid(orderCode, amountVnd);
    }
}
