package com.fitme.billing.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CheckoutResponse {
    private UUID orderId;
    private long payosOrderCode;
    private String checkoutUrl;
    private boolean mockPaid;
}
