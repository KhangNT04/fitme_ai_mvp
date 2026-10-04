package com.fitme.logistics.dto;

import com.fitme.common.enums.ShipmentStatus;
import com.fitme.logistics.entity.ShipmentEvent;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ShipmentEventDto {
    private ShipmentStatus status;
    private String description;
    private String location;
    private Instant occurredAt;

    public static ShipmentEventDto from(ShipmentEvent event) {
        return ShipmentEventDto.builder()
                .status(event.getStatus())
                .description(event.getDescription())
                .location(event.getLocation())
                .occurredAt(event.getOccurredAt())
                .build();
    }
}
