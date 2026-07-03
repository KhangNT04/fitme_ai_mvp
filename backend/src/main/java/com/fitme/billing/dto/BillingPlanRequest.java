package com.fitme.billing.dto;

import com.fitme.common.enums.BillingPlanType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BillingPlanRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    @NotNull
    private BillingPlanType planType;
    @Min(1)
    private long priceVnd;
    @Min(1)
    private int quotaAmount;
    private boolean includesDashboard;
    private Integer billingPeriodDays;
    private boolean active = true;
    private int sortOrder;
}
