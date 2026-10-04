package com.fitme.order.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PlaceOrderResponse {
    private OrderDetailDto order;
    /** PayOS checkout link; null for COD. */
    private String checkoutUrl;
    private boolean mockPaid;
}
