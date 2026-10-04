package com.fitme.logistics.dto;

import com.fitme.common.enums.ShipmentCarrier;
import com.fitme.common.enums.ShipmentStatus;
import com.fitme.logistics.entity.Shipment;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ShipmentDto {
    private UUID id;
    private ShipmentCarrier carrier;
    private String trackingCode;
    private ShipmentStatus status;
    private Instant estimatedDeliveryAt;
    private List<ShipmentEventDto> events;

    public static ShipmentDto from(Shipment shipment, List<ShipmentEventDto> events) {
        return ShipmentDto.builder()
                .id(shipment.getId())
                .carrier(shipment.getCarrier())
                .trackingCode(shipment.getTrackingCode())
                .status(shipment.getStatus())
                .estimatedDeliveryAt(shipment.getEstimatedDeliveryAt())
                .events(events)
                .build();
    }
}
