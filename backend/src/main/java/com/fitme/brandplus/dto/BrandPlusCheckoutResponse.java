package com.fitme.brandplus.dto;

import com.fitme.common.enums.PlanDiscountSource;
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
    private PlanDiscountSource discountSource;
    private long amountVnd;
    private String checkoutUrl;
    /** Mock PayOS: checkoutUrl is the FitMe return page, which confirms the order when it polls. */
    private boolean mock;
    /** Set when the voucher was applied (it is now RESERVED for this order). */
    private UUID voucherId;
    private String voucherCode;
    private boolean voucherApplied;
    /** A voucher was sent but the running discount was at least as large; the voucher stays ISSUED. */
    private String voucherIgnoredReason;
}
