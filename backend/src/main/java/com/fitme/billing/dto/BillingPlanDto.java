package com.fitme.billing.dto;

import com.fitme.common.enums.BillingPlanType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class BillingPlanDto {
    private UUID id;
    private String code;
    private String name;
    private BillingPlanType planType;
    private long priceVnd;
    private int quotaAmount;
    private boolean includesDashboard;
    private Integer billingPeriodDays;
    private boolean active;
    private int sortOrder;
}
