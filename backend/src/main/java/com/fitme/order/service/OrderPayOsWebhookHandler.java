package com.fitme.order.service;

import com.fitme.billing.payos.PayOsWebhookHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OrderPayOsWebhookHandler implements PayOsWebhookHandler {

    private final OrderPaymentService paymentService;

    @Override
    public boolean handlePaid(long orderCode, Long amountVnd) {
        return paymentService.handlePaid(orderCode, amountVnd);
    }
}
