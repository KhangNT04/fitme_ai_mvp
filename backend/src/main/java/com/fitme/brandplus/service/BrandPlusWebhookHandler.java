package com.fitme.brandplus.service;

import com.fitme.billing.payos.PayOsWebhookHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Claims verified PayOS webhooks whose order code is a Brand Plus order (codes never overlap consumer orders). */
@Component
@RequiredArgsConstructor
public class BrandPlusWebhookHandler implements PayOsWebhookHandler {

    private final BrandPlusService brandPlusService;

    @Override
    public boolean handlePaid(long orderCode, Long amountVnd) {
        return brandPlusService.handlePaid(orderCode, amountVnd);
    }

    @Override
    public boolean handleUnpaid(long orderCode) {
        return brandPlusService.handleUnpaid(orderCode);
    }
}
