package com.fitme.order.dto;

import com.fitme.common.enums.SellerOrderStatus;
import com.fitme.logistics.dto.ShipmentDto;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/** Seller order as embedded in the customer's {@link OrderDetailDto}. */
@Data
@Builder
public class SellerOrderDto {
    private UUID id;
    private UUID brandId;
    private String brandName;
    private SellerOrderStatus status;
    private long subtotalVnd;
    private long shippingFeeVnd;
    private List<OrderItemDto> items;
    private ShipmentDto shipment;
}
