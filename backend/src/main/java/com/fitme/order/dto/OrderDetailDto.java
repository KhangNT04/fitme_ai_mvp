package com.fitme.order.dto;

import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.PaymentMethod;
import com.fitme.common.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** {@link OrderSummaryDto} fields plus pricing, address snapshot and every seller order. */
@Data
@Builder
public class OrderDetailDto {
    private UUID id;
    private String orderCode;
    private OrderStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private long totalVnd;
    private int itemCount;
    private String firstItemImageUrl;
    private Instant createdAt;
    private long subtotalVnd;
    private long shippingFeeVnd;
    private long discountVnd;
    private long refundDueVnd;
    private String note;
    private OrderAddressDto address;
    private List<SellerOrderDto> sellerOrders;
}
