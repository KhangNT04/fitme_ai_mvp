package com.fitme.order.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayOrderResponse {
    private String checkoutUrl;
    private boolean mockPaid;
}
