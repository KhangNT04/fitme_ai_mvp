package com.fitme.order.service;

import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.common.exception.InvalidStatusTransitionException;
import com.fitme.common.util.EnumParser;
import com.fitme.logistics.dto.ShipOrderRequest;
import com.fitme.logistics.dto.ShipmentDto;
import com.fitme.logistics.entity.Shipment;
import com.fitme.logistics.service.ShipmentService;
import com.fitme.order.dto.SellerOrderDetailDto;
import com.fitme.order.dto.SellerOrderSummaryDto;
import com.fitme.order.entity.Order;
import com.fitme.order.entity.SellerOrder;
import com.fitme.order.repository.OrderRepository;
import com.fitme.order.repository.SellerOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Seller portal: a brand sees and moves only its own seller orders. */
@Service
@RequiredArgsConstructor
public class SellerOrderService {

    private final SellerOrderRepository sellerOrderRepository;
    private final OrderRepository orderRepository;
    private final OrderFulfillmentService fulfillmentService;
    private final ShipmentService shipmentService;
    private final OrderViewAssembler assembler;

    public List<SellerOrderSummaryDto> list(UUID brandId, String status) {
        if (status == null) {
            return assembler.sellerSummaries(sellerOrderRepository.findByBrandIdOrderByCreatedAtDesc(brandId));
        }
        return EnumParser.parse(SellerOrderStatus.class, status)
                .map(parsed -> assembler.sellerSummaries(
                        sellerOrderRepository.findByBrandIdAndStatusOrderByCreatedAtDesc(brandId, parsed)))
                .orElse(List.of());
    }

    public SellerOrderDetailDto detail(UUID brandId, UUID sellerOrderId) {
        assertOwner(brandId, sellerOrderId);
        return assembler.sellerDetail(sellerOrderRepository.findById(sellerOrderId).orElseThrow());
    }

    @Transactional
    public SellerOrderDetailDto confirm(UUID brandId, UUID sellerOrderId) {
        return advance(brandId, sellerOrderId, SellerOrderStatus.PENDING, SellerOrderStatus.CONFIRMED);
    }

    @Transactional
    public SellerOrderDetailDto pack(UUID brandId, UUID sellerOrderId) {
        return advance(brandId, sellerOrderId, SellerOrderStatus.CONFIRMED, SellerOrderStatus.PACKED);
    }

    /** Allowed until shipped; restores stock and cancels the customer order once every seller has cancelled. */
    @Transactional
    public SellerOrderDetailDto cancel(UUID brandId, UUID sellerOrderId, String reason) {
        assertOwner(brandId, sellerOrderId);
        Order order = fulfillmentService.lockParentOrder(sellerOrderId);
        SellerOrder sellerOrder = fulfillmentService.lockSellerOrder(sellerOrderId);
        switch (sellerOrder.getStatus()) {
            case PENDING, CONFIRMED, PACKED -> { }
            default -> throw new InvalidStatusTransitionException();
        }
        fulfillmentService.cancelSellerOrders(List.of(sellerOrder), reason);
        if (fulfillmentService.allSellerOrdersCancelled(order.getId())) {
            fulfillmentService.cancelOrder(order, null);
        } else {
            fulfillmentService.recomputeRefundDue(order);
        }
        return assembler.sellerDetail(sellerOrder);
    }

    @Transactional
    public ShipmentDto ship(UUID brandId, UUID sellerOrderId, ShipOrderRequest request) {
        assertOwner(brandId, sellerOrderId);
        fulfillmentService.lockParentOrder(sellerOrderId);
        SellerOrder sellerOrder = fulfillmentService.lockSellerOrder(sellerOrderId);
        if (sellerOrder.getStatus() != SellerOrderStatus.PACKED) {
            throw new InvalidStatusTransitionException();
        }
        Shipment shipment = shipmentService.create(sellerOrderId, request);
        sellerOrder.setStatus(SellerOrderStatus.SHIPPING);
        sellerOrderRepository.save(sellerOrder);
        return shipmentService.toDto(shipment);
    }

    private SellerOrderDetailDto advance(UUID brandId, UUID sellerOrderId, SellerOrderStatus from, SellerOrderStatus to) {
        assertOwner(brandId, sellerOrderId);
        Order order = fulfillmentService.lockParentOrder(sellerOrderId);
        SellerOrder sellerOrder = fulfillmentService.lockSellerOrder(sellerOrderId);
        // An unpaid PayOS order must stay PENDING_PAYMENT so the payment-timeout job can still release it.
        if (sellerOrder.getStatus() != from || order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            throw new InvalidStatusTransitionException();
        }
        sellerOrder.setStatus(to);
        sellerOrderRepository.save(sellerOrder);
        order.setStatus(OrderStatus.PROCESSING);
        orderRepository.save(order);
        return assembler.sellerDetail(sellerOrder);
    }

    private void assertOwner(UUID brandId, UUID sellerOrderId) {
        if (!sellerOrderRepository.existsByIdAndBrandId(sellerOrderId, brandId)) {
            throw new AccessDeniedException("Không có quyền truy cập đơn seller");
        }
    }
}
