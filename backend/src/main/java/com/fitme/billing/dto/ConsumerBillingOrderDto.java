package com.fitme.billing.dto;

import com.fitme.common.enums.BillingOrderStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ConsumerBillingOrderDto {
    private UUID orderId;
    private long payosOrderCode;
    private UUID planId;
    private String planName;
    private long amountVnd;
    private BillingOrderStatus status;
    private String checkoutUrl;
    private Instant createdAt;
    private Instant paidAt;
}
