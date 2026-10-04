package com.fitme.order.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class PlaceOrderRequest {
    private UUID addressId;
    /** {@code COD | PAYOS}; parsed in the service for a Vietnamese error. */
    private String paymentMethod;
    private UUID voucherId;
    /** Empty = the whole cart. */
    private List<UUID> cartItemIds;
    @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
    private String note;
}
