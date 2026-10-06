package com.fitme.brandplus.dto;

import com.fitme.common.enums.BillingOrderStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class BrandBillingOrderDto {
    private UUID orderId;
    private long orderCode;
    private String planName;
    private long listPriceVnd;
    private int discountPercentApplied;
    /** Voucher applied to this order, if any. */
    private String voucherCode;
    private long amountVnd;
    private BillingOrderStatus status;
    private String checkoutUrl;
    private Instant createdAt;
    private Instant paidAt;
    /** Brand Plus end date after this order (set once the order is PAID). */
    private Instant plusEndsAt;
}
