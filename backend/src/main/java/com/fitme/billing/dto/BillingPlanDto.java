package com.fitme.billing.dto;

import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.enums.PlanAudience;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class BillingPlanDto {
    private UUID id;
    private String code;
    private String name;
    private BillingPlanType planType;
    private PlanAudience audience;
    private long priceVnd;
    private int fitkenAmount;
    private Integer billingPeriodDays;
    private boolean active;
    private int sortOrder;
    private Integer discountPercent;
    private Instant discountStartsAt;
    private Instant discountEndsAt;
    /** True when the discount applies right now (see PlanPricing). */
    private boolean discountActive;
    /** Price charged at checkout right now. */
    private long effectivePriceVnd;
}
