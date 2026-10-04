package com.fitme.order.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Auto-cancels PayOS orders left unpaid past {@code fitme.commerce.payment-timeout-minutes}. */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrderPaymentTimeoutJob {

    private final OrderPaymentService paymentService;

    @Scheduled(fixedDelay = 60_000)
    public void cancelExpiredPayments() {
        for (UUID orderId : paymentService.findExpiredPendingPayments()) {
            try {
                paymentService.expirePendingPayment(orderId);
            } catch (RuntimeException ex) {
                log.warn("Could not expire unpaid order {}: {}", orderId, ex.getMessage());
            }
        }
    }
}
