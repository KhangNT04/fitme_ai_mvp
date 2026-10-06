package com.fitme.billing.dto;

import com.fitme.common.enums.BillingPlanType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BillingPlanRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    private BillingPlanType planType = BillingPlanType.SUBSCRIPTION;
    @Min(1)
    private long priceVnd;
    @Min(1)
    private int fitkenAmount;
    private Integer billingPeriodDays;
    private boolean active = true;
    private int sortOrder;
}
