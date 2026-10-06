package com.fitme.brandplus.dto;

import com.fitme.common.enums.BrandSubscriptionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class BrandPlusStatusDto {
    private boolean active;
    /** Subscription status as of now (an ACTIVE row past its end date is reported EXPIRED); null if never bought. */
    private BrandSubscriptionStatus status;
    private Instant startsAt;
    private Instant endsAt;
    /** False when admin has no active BRAND plan on sale (checkout disabled). */
    private boolean planAvailable;
    private UUID planId;
    private String planCode;
    private String planName;
    private Integer billingPeriodDays;
    private long listPriceVnd;
    private long effectivePriceVnd;
    private boolean discountActive;
    /** Discount fields are only set while the discount is active. */
    private Integer discountPercent;
    private Instant discountStartsAt;
    private Instant discountEndsAt;
    /** Most recent unpaid checkout, if any. */
    private BrandBillingOrderDto pendingOrder;
}
