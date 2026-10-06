package com.fitme.brandplus.dto;

import com.fitme.common.enums.PlanDiscountSource;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/** Price preview for a Brand Plus checkout, with or without a voucher. */
@Data
@Builder
public class BrandPlusQuoteDto {
    private long listPriceVnd;
    private int billingPeriodDays;
    /** Running time-window discount (0 when none). */
    private int windowPercent;
    private UUID voucherId;
    private String voucherCode;
    private Integer voucherPercent;
    private int appliedPercent;
    private PlanDiscountSource source;
    private long amountVnd;
    private boolean voucherApplied;
    private String voucherIgnoredReason;
}
