package com.fitme.order.dto;

import com.fitme.common.enums.PaymentMethod;
import com.fitme.common.enums.PaymentStatus;
import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.logistics.dto.ShipmentDto;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Seller portal view of one seller order: only this brand's items, never the other brands' slices. */
@Data
@Builder
public class SellerOrderDetailDto {
    private UUID id;
    private UUID orderId;
    private String orderCode;
    private UUID brandId;
    private String brandName;
    private SellerOrderStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private long subtotalVnd;
    private long shippingFeeVnd;
    private long commissionVnd;
    private long payoutVnd;
    private String note;
    private String cancelReason;
    private Instant createdAt;
    private OrderAddressDto address;
    private List<OrderItemDto> items;
    private ShipmentDto shipment;
}
