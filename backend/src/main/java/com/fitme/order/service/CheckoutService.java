package com.fitme.order.service;

import com.fitme.address.entity.ShippingAddress;
import com.fitme.address.service.AddressService;
import com.fitme.cart.dto.CartItemDto;
import com.fitme.cart.service.CartLine;
import com.fitme.cart.service.CartService;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.PaymentMethod;
import com.fitme.common.enums.PaymentStatus;
import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.common.enums.VoucherStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.common.util.EnumParser;
import com.fitme.notification.OrderConfirmedEvent;
import com.fitme.order.dto.OrderPreviewDto;
import com.fitme.order.dto.PlaceOrderRequest;
import com.fitme.order.dto.PlaceOrderResponse;
import com.fitme.order.dto.PreviewOrderRequest;
import com.fitme.order.entity.Order;
import com.fitme.order.entity.OrderItem;
import com.fitme.order.entity.SellerOrder;
import com.fitme.order.repository.OrderItemRepository;
import com.fitme.order.repository.OrderRepository;
import com.fitme.order.repository.SellerOrderRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.voucher.entity.UserVoucher;
import com.fitme.voucher.repository.UserVoucherRepository;
import com.fitme.voucher.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/** Checkout pricing (subtotal, per-seller shipping, FREESHIP voucher) and order placement. */
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final CartService cartService;
    private final AddressService addressService;
    private final OrderRepository orderRepository;
    private final SellerOrderRepository sellerOrderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductVariantRepository variantRepository;
    private final UserVoucherRepository voucherRepository;
    private final VoucherService voucherService;
    private final OrderPaymentService paymentService;
    private final OrderViewAssembler assembler;
    private final FitMeProperties properties;
    private final AppClock clock;
    private final ApplicationEventPublisher events;

    private record Pricing(long subtotalVnd, long shippingFeeVnd, long discountVnd, UserVoucher voucher,
                           Map<UUID, List<CartLine>> groups) {
        long totalVnd() {
            return subtotalVnd + shippingFeeVnd - discountVnd;
        }
    }

    public OrderPreviewDto preview(UUID userId, PreviewOrderRequest request) {
        Pricing pricing = price(checkoutLines(userId, request.getCartItemIds(), false), request.getVoucherId(), userId, false);
        UserVoucher voucher = pricing.voucher();
        List<OrderPreviewDto.Group> groups = new ArrayList<>();
        pricing.groups().forEach((brandId, lines) -> groups.add(OrderPreviewDto.Group.builder()
                .brandId(brandId)
                .brandName(lines.getFirst().brand().getName())
                .subtotalVnd(CartService.subtotal(lines))
                .shippingFeeVnd(shippingFeePerSeller())
                .items(lines.stream().map(CartItemDto::from).toList())
                .build()));
        return OrderPreviewDto.builder()
                .subtotalVnd(pricing.subtotalVnd())
                .shippingFeeVnd(pricing.shippingFeeVnd())
                .discountVnd(pricing.discountVnd())
                .totalVnd(pricing.totalVnd())
                .voucher(voucher == null ? null : OrderPreviewDto.Voucher.builder()
                        .id(voucher.getId())
                        .voucherType(voucher.getVoucherType())
                        .maxDiscountVnd(voucher.getMaxDiscountVnd())
                        .build())
                .groups(groups)
                .build();
    }

    @Transactional
    public PlaceOrderResponse place(UUID userId, PlaceOrderRequest request) {
        PaymentMethod method = EnumParser.parse(PaymentMethod.class, request.getPaymentMethod())
                .orElseThrow(() -> new BusinessException("Phương thức thanh toán không hợp lệ"));
        if (request.getAddressId() == null) {
            throw new BusinessException("Vui lòng chọn địa chỉ giao hàng");
        }
        ShippingAddress address = addressService.requireOwned(userId, request.getAddressId());
        List<CartLine> lines = checkoutLines(userId, request.getCartItemIds(), true);
        Pricing pricing = price(lines, request.getVoucherId(), userId, true);
        boolean payos = method == PaymentMethod.PAYOS;

        Order order = orderRepository.save(Order.builder()
                .userId(userId)
                .orderCode(newOrderCode())
                .payosOrderCode(payos ? paymentService.newPayosOrderCode() : null)
                .status(payos ? OrderStatus.PENDING_PAYMENT : OrderStatus.CONFIRMED)
                .paymentMethod(method)
                .paymentStatus(PaymentStatus.UNPAID)
                .subtotalVnd(pricing.subtotalVnd())
                .shippingFeeVnd(pricing.shippingFeeVnd())
                .discountVnd(pricing.discountVnd())
                .totalVnd(pricing.totalVnd())
                .voucherId(request.getVoucherId())
                .recipientName(address.getRecipientName())
                .phone(address.getPhone())
                .province(address.getProvince())
                .district(address.getDistrict())
                .ward(address.getWard())
                .street(address.getStreet())
                .note(request.getNote())
                .build());

        pricing.groups().forEach((brandId, brandLines) -> createSellerOrder(order, brandId, brandLines));

        if (request.getVoucherId() != null) {
            voucherService.reserveForOrder(userId, request.getVoucherId(), order.getId());
            if (method == PaymentMethod.COD) {
                voucherService.markUsedForOrder(order.getId());
            }
        }
        cartService.removeLines(lines);

        String checkoutUrl = null;
        if (payos) {
            paymentService.recordPendingTransaction(order);
            checkoutUrl = paymentService.checkoutUrl(order);
        } else {
            events.publishEvent(new OrderConfirmedEvent(order.getId(), false));
        }
        return PlaceOrderResponse.builder()
                .order(assembler.detail(order))
                .checkoutUrl(checkoutUrl)
                .mockPaid(paymentService.isMock())
                .build();
    }

    private void createSellerOrder(Order order, UUID brandId, List<CartLine> lines) {
        long subtotal = CartService.subtotal(lines);
        long commission = commission(subtotal);
        SellerOrder sellerOrder = sellerOrderRepository.save(SellerOrder.builder()
                .orderId(order.getId())
                .brandId(brandId)
                .status(SellerOrderStatus.PENDING)
                .subtotalVnd(subtotal)
                .shippingFeeVnd(shippingFeePerSeller())
                .commissionVnd(commission)
                .payoutVnd(subtotal - commission)
                .build());
        for (CartLine line : lines) {
            if (variantRepository.reserveStock(line.variant().getId(), line.quantity()) == 0) {
                throw new BusinessException("Sản phẩm đã hết hàng", CartService.OUT_OF_STOCK);
            }
            orderItemRepository.save(OrderItem.builder()
                    .sellerOrderId(sellerOrder.getId())
                    .productId(line.product().getId())
                    .variantId(line.variant().getId())
                    .productName(line.product().getName())
                    .variantLabel(line.variantLabel())
                    .imageUrl(line.imageUrl())
                    .unitPriceVnd(line.unitPriceVnd())
                    .quantity(line.quantity())
                    .lineTotalVnd(line.lineTotalVnd())
                    .build());
        }
    }

    private List<CartLine> checkoutLines(UUID userId, List<UUID> cartItemIds, boolean placing) {
        List<CartLine> lines = cartService.loadLines(userId, cartItemIds, placing);
        if (lines.isEmpty()) {
            throw new BusinessException("Giỏ hàng trống", "CART_EMPTY");
        }
        if (lines.stream().anyMatch(line -> !line.purchasable())) {
            throw new BusinessException("Có sản phẩm hết hàng hoặc không còn bán", CartService.OUT_OF_STOCK);
        }
        return lines;
    }

    /** {@code lockVoucher}: placing an order locks the voucher row before it is validated and reserved. */
    private Pricing price(List<CartLine> lines, UUID voucherId, UUID userId, boolean lockVoucher) {
        Map<UUID, List<CartLine>> groups = CartService.groupByBrand(lines);
        long subtotal = CartService.subtotal(lines);
        long shipping = groups.size() * shippingFeePerSeller();
        UserVoucher voucher = null;
        long discount = 0;
        if (voucherId != null) {
            voucher = (lockVoucher ? voucherRepository.findByIdForUpdate(voucherId) : voucherRepository.findById(voucherId))
                    .orElseThrow(() -> new NotFoundException("Voucher không tồn tại"));
            if (!voucher.getUserId().equals(userId) || voucher.getStatus() != VoucherStatus.AVAILABLE
                    || !voucher.getExpiresAt().isAfter(clock.now())) {
                throw new BusinessException("Voucher không khả dụng");
            }
            discount = Math.min(shipping, voucher.getMaxDiscountVnd());
        }
        return new Pricing(subtotal, shipping, discount, voucher, groups);
    }

    private long shippingFeePerSeller() {
        return properties.getCommerce().getDefaultShippingFeeVnd();
    }

    private long commission(long subtotal) {
        return BigDecimal.valueOf(subtotal)
                .multiply(BigDecimal.valueOf(properties.getCommerce().getCommissionRate()))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();
    }

    private String newOrderCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String code = "FM" + System.currentTimeMillis() + String.format("%02d", ThreadLocalRandom.current().nextInt(100));
            if (!orderRepository.existsByOrderCode(code)) {
                return code;
            }
        }
        throw new BusinessException("Không thể tạo mã đơn hàng");
    }
}
