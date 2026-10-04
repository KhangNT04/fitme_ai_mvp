package com.fitme.order.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class PreviewOrderRequest {
    private UUID addressId;
    private UUID voucherId;
    /** Empty = the whole cart. */
    private List<UUID> cartItemIds;
}
