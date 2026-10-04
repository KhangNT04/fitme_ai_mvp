package com.fitme.logistics.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ShipOrderRequest {
    /** {@code GHN | GHTK | VIETTEL_POST | SELF}; parsed in the service for a Vietnamese error. */
    private String carrier;
    /** Generated when blank. */
    @Size(max = 100, message = "Mã vận đơn quá dài")
    private String trackingCode;
}
