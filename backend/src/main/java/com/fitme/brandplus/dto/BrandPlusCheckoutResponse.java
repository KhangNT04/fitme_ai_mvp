package com.fitme.brandplus.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class BrandPlusCheckoutResponse {
    private UUID orderId;
    private long orderCode;
    private long listPriceVnd;
    private int discountPercentApplied;
    private long amountVnd;
    private String checkoutUrl;
    /** Mock PayOS: checkoutUrl is the FitMe return page, which confirms the order when it polls. */
    private boolean mock;
}
