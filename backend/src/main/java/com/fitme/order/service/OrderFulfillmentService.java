package com.fitme.order.service;

import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.PaymentMethod;
import com.fitme.common.enums.PaymentStatus;
import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.order.entity.Order;
import com.fitme.order.entity.OrderItem;
import com.fitme.order.entity.SellerOrder;
import com.fitme.order.repository.OrderItemRepository;
import com.fitme.order.repository.OrderRepository;
import com.fitme.order.repository.SellerOrderRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.voucher.service.VoucherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/**
 * Order state changes shared by customer, seller, payment and logistics flows.
 * Every commerce mutation locks the parent order row first, then its seller orders, so concurrent
 * customer / seller / carrier / payment updates are serialized per order and cannot deadlock.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderFulfillmentService {

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository variantRepository;
    private final VoucherService voucherService;
    private final AppClock clock;

    @Transactional
    public Order lockOrder(UUID orderId) {
        return orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new NotFoundException("Đơn hàng không tồn tại"));
    }

    /** Locks the customer order that owns {@code sellerOrderId}. */
    @Transactional
    public Order lockParentOrder(UUID sellerOrderId) {
        UUID orderId = sellerOrderRepository.findOrderIdById(sellerOrderId)
                .orElseThrow(() -> new NotFoundException("Đơn seller không tồn tại"));
        return lockOrder(orderId);
    }

    @Transactional
    public SellerOrder lockSellerOrder(UUID sellerOrderId) {
        return sellerOrderRepository.findByIdForUpdate(sellerOrderId)
                .orElseThrow(() -> new NotFoundException("Đơn seller không tồn tại"));
    }

    /** Seller order delivered; the customer order completes once no seller order is still in progress. */
    @Transactional
    public void markSellerOrderDelivered(UUID sellerOrderId) {
        Order order = lockParentOrder(sellerOrderId);
        SellerOrder sellerOrder = lockSellerOrder(sellerOrderId);
        Instant now = clock.now();
        sellerOrder.setStatus(SellerOrderStatus.DELIVERED);
        if (sellerOrder.getDeliveredAt() == null) {
            sellerOrder.setDeliveredAt(now);
        }
        sellerOrderRepository.save(sellerOrder);

        boolean inProgress = sellerOrderRepository.existsByOrderIdAndStatusNotIn(order.getId(),
                EnumSet.of(SellerOrderStatus.DELIVERED, SellerOrderStatus.CANCELLED));
        if (!inProgress) {
            order.setStatus(OrderStatus.COMPLETED);
            if (order.getPaymentMethod() == PaymentMethod.COD) {
                order.setPaymentStatus(PaymentStatus.PAID);
                if (order.getPaidAt() == null) {
                    order.setPaidAt(now);
                }
            }
            orderRepository.save(order);
        }
    }

    /** Cancels seller orders that are not cancelled yet and puts their items back in stock. */
    @Transactional
    public void cancelSellerOrders(List<SellerOrder> sellerOrders, String reason) {
        List<SellerOrder> active = sellerOrders.stream()
                .filter(sellerOrder -> sellerOrder.getStatus() != SellerOrderStatus.CANCELLED)
                .toList();
        if (active.isEmpty()) {
            return;
        }
        for (OrderItem item : orderItemRepository.findBySellerOrderIdIn(active.stream().map(SellerOrder::getId).toList())) {
            variantRepository.restoreStock(item.getVariantId(), item.getQuantity());
        }
        active.forEach(sellerOrder -> {
            sellerOrder.setStatus(SellerOrderStatus.CANCELLED);
            sellerOrder.setCancelReason(reason);
        });
        sellerOrderRepository.saveAll(active);
    }

    /**
     * Recomputes how much of a captured payment belongs to cancelled seller orders. The freeship
     * discount is capped by the shipping fees still owed. No-op unless the order is PAID.
     */
    @Transactional
    public void recomputeRefundDue(Order order) {
        if (order.getPaymentStatus() != PaymentStatus.PAID) {
            return;
        }
        List<SellerOrder> active = sellerOrderRepository.findByOrderId(order.getId()).stream()
                .filter(sellerOrder -> sellerOrder.getStatus() != SellerOrderStatus.CANCELLED)
                .toList();
        long shipping = active.stream().mapToLong(SellerOrder::getShippingFeeVnd).sum();
        long subtotal = active.stream().mapToLong(SellerOrder::getSubtotalVnd).sum();
        long stillOwed = subtotal + shipping - Math.min(order.getDiscountVnd(), shipping);
        long refundDue = Math.max(0, order.getTotalVnd() - stillOwed);
        if (refundDue == order.getRefundDueVnd()) {
            return;
        }
        order.setRefundDueVnd(refundDue);
        orderRepository.save(order);
        log.warn("Order {} has {} VND to refund to the customer (paid {} VND)",
                order.getOrderCode(), refundDue, order.getTotalVnd());
    }

    /** Marks the customer order cancelled (a captured payment becomes REFUNDED) and returns its voucher. */
    @Transactional
    public void cancelOrder(Order order, String reason) {
        recomputeRefundDue(order);
        order.setStatus(OrderStatus.CANCELLED);
        if (reason != null) {
            order.setCancelReason(reason);
        }
        order.setCancelledAt(clock.now());
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            order.setPaymentStatus(PaymentStatus.REFUNDED);
        }
        orderRepository.save(order);
        voucherService.releaseForOrder(order.getId());
    }

    public boolean allSellerOrdersCancelled(UUID orderId) {
        return !sellerOrderRepository.existsByOrderIdAndStatusNotIn(orderId, EnumSet.of(SellerOrderStatus.CANCELLED));
    }
}
