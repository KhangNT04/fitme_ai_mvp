package com.fitme.order.service;

import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.InvalidStatusTransitionException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.util.EnumParser;
import com.fitme.order.dto.OrderDetailDto;
import com.fitme.order.dto.OrderSummaryDto;
import com.fitme.order.dto.PayOrderResponse;
import com.fitme.order.dto.TrackingEntryDto;
import com.fitme.order.entity.Order;
import com.fitme.order.repository.OrderRepository;
import com.fitme.order.repository.SellerOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Customer order history, cancellation and PayOS re-payment, plus the admin order monitor. */
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderFulfillmentService fulfillmentService;
    private final OrderPaymentService paymentService;
    private final OrderViewAssembler assembler;

    public List<OrderSummaryDto> list(UUID userId, String status) {
        if (status == null) {
            return assembler.summaries(orderRepository.findByUserIdOrderByCreatedAtDesc(userId));
        }
        return parseStatus(status)
                .map(parsed -> assembler.summaries(orderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, parsed)))
                .orElse(List.of());
    }

    public OrderDetailDto detail(UUID userId, UUID orderId) {
        return assembler.detail(requireOwned(userId, orderId));
    }

    public List<TrackingEntryDto> tracking(UUID userId, UUID orderId) {
        return assembler.tracking(requireOwned(userId, orderId));
    }

    /** Allowed until a seller order is handed to the carrier; stock and voucher are returned. */
    @Transactional
    public OrderDetailDto cancel(UUID userId, UUID orderId, String reason) {
        Order order = fulfillmentService.lockOrder(orderId);
        assertOwner(userId, order);
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.COMPLETED
                || sellerOrderRepository.existsByOrderIdAndStatusIn(orderId,
                EnumSet.of(SellerOrderStatus.SHIPPING, SellerOrderStatus.DELIVERED))) {
            throw new BusinessException("Đơn hàng không thể hủy", "ORDER_NOT_CANCELLABLE");
        }
        fulfillmentService.cancelSellerOrders(sellerOrderRepository.findByOrderId(orderId), reason);
        fulfillmentService.cancelOrder(order, reason);
        return assembler.detail(order);
    }

    public PayOrderResponse pay(UUID userId, UUID orderId) {
        Order order = requireOwned(userId, orderId);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw new InvalidStatusTransitionException();
        }
        return PayOrderResponse.builder()
                .checkoutUrl(paymentService.checkoutUrl(order))
                .mockPaid(paymentService.isMock())
                .build();
    }

    /** Customer returns from PayOS; with the mock gateway this is where the payment is confirmed. */
    @Transactional
    public OrderDetailDto payosReturn(UUID userId, long payosOrderCode) {
        UUID orderId = orderRepository.findIdByUserIdAndPayosOrderCode(userId, payosOrderCode)
                .orElseThrow(() -> new NotFoundException("Đơn hàng không tồn tại"));
        if (paymentService.isMock()) {
            paymentService.handlePaid(payosOrderCode);
        }
        return detail(userId, orderId);
    }

    public List<OrderSummaryDto> adminList(String status) {
        if (status == null) {
            return assembler.summaries(orderRepository.findAllByOrderByCreatedAtDesc());
        }
        return parseStatus(status)
                .map(parsed -> assembler.summaries(orderRepository.findByStatusOrderByCreatedAtDesc(parsed)))
                .orElse(List.of());
    }

    public OrderDetailDto adminDetail(UUID orderId) {
        return assembler.detail(orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Đơn hàng không tồn tại")));
    }

    private Order requireOwned(UUID userId, UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Đơn hàng không tồn tại"));
        assertOwner(userId, order);
        return order;
    }

    private static void assertOwner(UUID userId, Order order) {
        if (!order.getUserId().equals(userId)) {
            throw new AccessDeniedException("Không có quyền truy cập đơn hàng");
        }
    }

    private static Optional<OrderStatus> parseStatus(String status) {
        return EnumParser.parse(OrderStatus.class, status);
    }
}
