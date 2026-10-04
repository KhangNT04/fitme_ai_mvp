package com.fitme.notification;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Sends emails only after the order/payment transaction commits, off the request thread. */
@Component
@RequiredArgsConstructor
public class CustomerEmailListener {

    private final CustomerEmailService emails;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmed(OrderConfirmedEvent event) {
        emails.orderConfirmed(event.orderId(), event.paidOnline());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPlanPurchased(PlanPurchasedEvent event) {
        emails.planPurchased(event.billingOrderId());
    }
}
