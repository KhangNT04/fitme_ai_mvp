package com.fitme.order.dto;

import com.fitme.common.enums.PaymentMethod;
import com.fitme.common.enums.PaymentStatus;
import com.fitme.common.enums.SellerOrderStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SellerOrderSummaryDto {
    private UUID id;
    private UUID orderId;
    private String orderCode;
    private SellerOrderStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private long subtotalVnd;
    private long shippingFeeVnd;
    private int itemCount;
    private String firstItemImageUrl;
    private Instant createdAt;
}
