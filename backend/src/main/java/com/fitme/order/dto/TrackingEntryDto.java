package com.fitme.order.dto;

import com.fitme.logistics.dto.ShipmentDto;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class TrackingEntryDto {
    private UUID sellerOrderId;
    private String brandName;
    private ShipmentDto shipment;
}
