package com.fitme.logistics.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LogisticsEventRequest {
    private String trackingCode;
    private String status;
    private String description;
    @Size(max = 255, message = "Vị trí quá dài")
    private String location;

    public ShipmentEventRequest toEvent() {
        ShipmentEventRequest event = new ShipmentEventRequest();
        event.setStatus(status);
        event.setDescription(description);
        event.setLocation(location);
        return event;
    }
}
