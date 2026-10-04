package com.fitme.logistics.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ShipmentEventRequest {
    private String status;
    private String description;
    @Size(max = 255, message = "Vị trí quá dài")
    private String location;
}
