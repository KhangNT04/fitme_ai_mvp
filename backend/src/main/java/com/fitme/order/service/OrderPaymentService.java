package com.fitme.order.service;

import com.fitme.billing.payos.PayOsClient;
import com.fitme.billing.repository.ConsumerBillingOrderRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.PaymentStatus;
import com.fitme.common.enums.PaymentTransactionStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.time.AppClock;
import com.fitme.notification.OrderConfirmedEvent;
import com.fitme.order.entity.Order;
import com.fitme.order.entity.PaymentTransaction;
import com.fitme.order.repository.OrderRepository;
import com.fitme.order.repository.PaymentTransactionRepository;
import com.fitme.order.repository.SellerOrderRepository;
import com.fitme.voucher.service.VoucherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * PayOS lifecycle of commerce orders: payment links, paid callbacks and payment timeouts.
 *
 * <p>A payment that arrives after the order was auto-cancelled (timeout) is still recorded: the
 * transaction and the order's {@code paymentStatus} become PAID while the order stays CANCELLED.
 * Every other cancel path turns PAID into REFUNDED, so {@code CANCELLED + PAID} uniquely means
 * "money received for a cancelled order — admin must refund"; a WARN is logged for follow-up.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderPaymentService {

    public static final String TIMEOUT_REASON = "Quá hạn thanh toán";
    private static final String PAYMENT_DESCRIPTION = "Thanh toán đơn hàng FitMe";

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final ConsumerBillingOrderRepository billingOrderRepository;
    private final OrderFulfillmentService fulfillmentService;
    private final VoucherService voucherService;
    private final PayOsClient payOsClient;
    private final FitMeProperties properties;
    private final AppClock clock;
    private final ApplicationEventPublisher events;

    public boolean isMock() {
        return properties.getPayos().isMock();
    }

    /** PayOS order codes are shared with subscription orders, so uniqueness is checked against both tables. */
    public long newPayosOrderCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            long code = (System.currentTimeMillis() % 9_000_000_000L) * 10 + ThreadLocalRandom.current().nextInt(10);
            if (!orderRepository.existsByPayosOrderCode(code) && !billingOrderRepository.existsByPayosOrderCode(code)) {
                return code;
            }
        }
        throw new BusinessException("Không thể tạo mã thanh toán");
    }

    @Transactional
    public void recordPendingTransaction(Order order) {
        transactionRepository.save(PaymentTransaction.builder()
                .orderId(order.getId())
                .provider(PaymentTransaction.PROVIDER_PAYOS)
                .providerOrderCode(order.getPayosOrderCode())
                .status(PaymentTransactionStatus.PENDING)
                .amountVnd(order.getTotalVnd())
                .build());
    }

    public String checkoutUrl(Order order) {
        return payOsClient.createPaymentLink(order.getPayosOrderCode(), order.getTotalVnd(), PAYMENT_DESCRIPTION,
                properties.getPayos().getOrderReturnUrl(), properties.getPayos().getOrderCancelUrl()).checkoutUrl();
    }

    /**
     * Idempotently records a PayOS payment.
     *
     * @return false when {@code payosOrderCode} does not belong to a commerce order
     */
    @Transactional
    public boolean handlePaid(long payosOrderCode) {
        Optional<Order> found = orderRepository.findByPayosOrderCodeForUpdate(payosOrderCode);
        if (found.isEmpty()) {
            return false;
        }
        Order order = found.get();
        if (order.getPaymentStatus() != PaymentStatus.UNPAID) {
            return true;
        }
        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaidAt(clock.now());
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            order.setStatus(OrderStatus.CONFIRMED);
            voucherService.markUsedForOrder(order.getId());
            events.publishEvent(new OrderConfirmedEvent(order.getId(), true));
        } else if (order.getStatus() == OrderStatus.CANCELLED) {
            log.warn("PayOS payment received for cancelled order {} (payosOrderCode={}, amount={} VND) - manual refund required",
                    order.getOrderCode(), payosOrderCode, order.getTotalVnd());
        }
        orderRepository.save(order);
        fulfillmentService.recomputeRefundDue(order);
        List<PaymentTransaction> transactions = transactionRepository.findByOrderId(order.getId());
        transactions.forEach(transaction -> transaction.setStatus(PaymentTransactionStatus.PAID));
        transactionRepository.saveAll(transactions);
        return true;
    }

    public List<UUID> findExpiredPendingPayments() {
        Instant cutoff = clock.now().minus(properties.getCommerce().getPaymentTimeoutMinutes(), ChronoUnit.MINUTES);
        return orderRepository.findIdsByStatusCreatedBefore(OrderStatus.PENDING_PAYMENT, cutoff);
    }

    /** Cancels an unpaid PayOS order past the payment timeout: stock and voucher are returned. */
    @Transactional
    public void expirePendingPayment(UUID orderId) {
        Order order = fulfillmentService.lockOrder(orderId);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            return;
        }
        fulfillmentService.cancelSellerOrders(sellerOrderRepository.findByOrderId(orderId), TIMEOUT_REASON);
        fulfillmentService.cancelOrder(order, TIMEOUT_REASON);
    }
}
