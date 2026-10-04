package com.fitme.order.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.exception.NotFoundException;
import com.fitme.logistics.dto.ShipmentDto;
import com.fitme.logistics.service.ShipmentService;
import com.fitme.order.dto.*;
import com.fitme.order.entity.Order;
import com.fitme.order.entity.OrderItem;
import com.fitme.order.entity.SellerOrder;
import com.fitme.order.repository.OrderItemRepository;
import com.fitme.order.repository.OrderRepository;
import com.fitme.order.repository.SellerOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Builds order DTOs with batched lookups (seller orders, items, brands, shipments). */
@Component
@RequiredArgsConstructor
public class OrderViewAssembler {

    private static final Comparator<OrderItem> ITEM_ORDER = Comparator
            .comparing(OrderItem::getProductName)
            .thenComparing(item -> Objects.toString(item.getVariantLabel(), ""));

    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final BrandRepository brandRepository;
    private final ShipmentService shipmentService;

    public List<OrderSummaryDto> summaries(List<Order> orders) {
        if (orders.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<SellerOrder>> sellerOrders = sellerOrderRepository
                .findByOrderIdIn(orders.stream().map(Order::getId).toList()).stream()
                .collect(Collectors.groupingBy(SellerOrder::getOrderId));
        Map<UUID, List<OrderItem>> items = itemsBySellerOrder(sellerOrders.values().stream()
                .flatMap(List::stream).map(SellerOrder::getId).toList());
        return orders.stream()
                .map(order -> {
                    List<OrderItem> orderItems = sellerOrders.getOrDefault(order.getId(), List.of()).stream()
                            .flatMap(sellerOrder -> items.getOrDefault(sellerOrder.getId(), List.of()).stream())
                            .toList();
                    return OrderSummaryDto.builder()
                            .id(order.getId())
                            .orderCode(order.getOrderCode())
                            .status(order.getStatus())
                            .paymentMethod(order.getPaymentMethod())
                            .paymentStatus(order.getPaymentStatus())
                            .totalVnd(order.getTotalVnd())
                            .itemCount(itemCount(orderItems))
                            .firstItemImageUrl(firstImage(orderItems))
                            .createdAt(order.getCreatedAt())
                            .build();
                })
                .toList();
    }

    public OrderDetailDto detail(Order order) {
        List<SellerOrder> sellerOrders = new ArrayList<>(sellerOrderRepository.findByOrderId(order.getId()));
        Map<UUID, Brand> brands = brands(sellerOrders);
        sellerOrders.sort(Comparator.comparing(sellerOrder -> brandName(brands, sellerOrder)));
        List<UUID> sellerOrderIds = sellerOrders.stream().map(SellerOrder::getId).toList();
        Map<UUID, List<OrderItem>> items = itemsBySellerOrder(sellerOrderIds);
        Map<UUID, ShipmentDto> shipments = shipmentService.findBySellerOrderIds(sellerOrderIds);
        List<OrderItem> allItems = sellerOrderIds.stream()
                .flatMap(id -> items.getOrDefault(id, List.of()).stream())
                .toList();
        return OrderDetailDto.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .totalVnd(order.getTotalVnd())
                .itemCount(itemCount(allItems))
                .firstItemImageUrl(firstImage(allItems))
                .createdAt(order.getCreatedAt())
                .subtotalVnd(order.getSubtotalVnd())
                .shippingFeeVnd(order.getShippingFeeVnd())
                .discountVnd(order.getDiscountVnd())
                .refundDueVnd(order.getRefundDueVnd())
                .note(order.getNote())
                .address(OrderAddressDto.from(order))
                .sellerOrders(sellerOrders.stream()
                        .map(sellerOrder -> SellerOrderDto.builder()
                                .id(sellerOrder.getId())
                                .brandId(sellerOrder.getBrandId())
                                .brandName(brandName(brands, sellerOrder))
                                .status(sellerOrder.getStatus())
                                .subtotalVnd(sellerOrder.getSubtotalVnd())
                                .shippingFeeVnd(sellerOrder.getShippingFeeVnd())
                                .items(itemDtos(items.get(sellerOrder.getId())))
                                .shipment(shipments.get(sellerOrder.getId()))
                                .build())
                        .toList())
                .build();
    }

    public List<TrackingEntryDto> tracking(Order order) {
        List<SellerOrder> sellerOrders = new ArrayList<>(sellerOrderRepository.findByOrderId(order.getId()));
        Map<UUID, Brand> brands = brands(sellerOrders);
        sellerOrders.sort(Comparator.comparing(sellerOrder -> brandName(brands, sellerOrder)));
        Map<UUID, ShipmentDto> shipments = shipmentService.findBySellerOrderIds(
                sellerOrders.stream().map(SellerOrder::getId).toList());
        return sellerOrders.stream()
                .map(sellerOrder -> TrackingEntryDto.builder()
                        .sellerOrderId(sellerOrder.getId())
                        .brandName(brandName(brands, sellerOrder))
                        .shipment(shipments.get(sellerOrder.getId()))
                        .build())
                .toList();
    }

    public List<SellerOrderSummaryDto> sellerSummaries(List<SellerOrder> sellerOrders) {
        if (sellerOrders.isEmpty()) {
            return List.of();
        }
        Map<UUID, Order> orders = orderRepository.findAllById(sellerOrders.stream().map(SellerOrder::getOrderId)
                        .collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Order::getId, Function.identity()));
        Map<UUID, List<OrderItem>> items = itemsBySellerOrder(sellerOrders.stream().map(SellerOrder::getId).toList());
        return sellerOrders.stream()
                .map(sellerOrder -> {
                    Order order = orders.get(sellerOrder.getOrderId());
                    List<OrderItem> sellerItems = items.getOrDefault(sellerOrder.getId(), List.of());
                    return SellerOrderSummaryDto.builder()
                            .id(sellerOrder.getId())
                            .orderId(order.getId())
                            .orderCode(order.getOrderCode())
                            .status(sellerOrder.getStatus())
                            .paymentMethod(order.getPaymentMethod())
                            .paymentStatus(order.getPaymentStatus())
                            .subtotalVnd(sellerOrder.getSubtotalVnd())
                            .shippingFeeVnd(sellerOrder.getShippingFeeVnd())
                            .itemCount(itemCount(sellerItems))
                            .firstItemImageUrl(firstImage(sellerItems))
                            .createdAt(sellerOrder.getCreatedAt())
                            .build();
                })
                .toList();
    }

    public SellerOrderDetailDto sellerDetail(SellerOrder sellerOrder) {
        Order order = orderRepository.findById(sellerOrder.getOrderId())
                .orElseThrow(() -> new NotFoundException("Đơn hàng không tồn tại"));
        Map<UUID, Brand> brands = brands(List.of(sellerOrder));
        return SellerOrderDetailDto.builder()
                .id(sellerOrder.getId())
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .brandId(sellerOrder.getBrandId())
                .brandName(brandName(brands, sellerOrder))
                .status(sellerOrder.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .subtotalVnd(sellerOrder.getSubtotalVnd())
                .shippingFeeVnd(sellerOrder.getShippingFeeVnd())
                .commissionVnd(sellerOrder.getCommissionVnd())
                .payoutVnd(sellerOrder.getPayoutVnd())
                .note(order.getNote())
                .cancelReason(sellerOrder.getCancelReason())
                .createdAt(sellerOrder.getCreatedAt())
                .address(OrderAddressDto.from(order))
                .items(itemDtos(orderItemRepository.findBySellerOrderId(sellerOrder.getId())))
                .shipment(shipmentService.findBySellerOrderIds(List.of(sellerOrder.getId())).get(sellerOrder.getId()))
                .build();
    }

    private Map<UUID, List<OrderItem>> itemsBySellerOrder(Collection<UUID> sellerOrderIds) {
        if (sellerOrderIds.isEmpty()) {
            return Map.of();
        }
        return orderItemRepository.findBySellerOrderIdIn(sellerOrderIds).stream()
                .sorted(ITEM_ORDER)
                .collect(Collectors.groupingBy(OrderItem::getSellerOrderId, LinkedHashMap::new, Collectors.toList()));
    }

    private Map<UUID, Brand> brands(Collection<SellerOrder> sellerOrders) {
        return brandRepository.findAllById(sellerOrders.stream().map(SellerOrder::getBrandId)
                        .collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Brand::getId, Function.identity()));
    }

    private static String brandName(Map<UUID, Brand> brands, SellerOrder sellerOrder) {
        Brand brand = brands.get(sellerOrder.getBrandId());
        return brand == null ? "" : brand.getName();
    }

    private static List<OrderItemDto> itemDtos(List<OrderItem> items) {
        return items == null ? List.of() : items.stream().sorted(ITEM_ORDER).map(OrderItemDto::from).toList();
    }

    private static int itemCount(List<OrderItem> items) {
        return items.stream().mapToInt(OrderItem::getQuantity).sum();
    }

    private static String firstImage(List<OrderItem> items) {
        return items.isEmpty() ? null : items.getFirst().getImageUrl();
    }
}
