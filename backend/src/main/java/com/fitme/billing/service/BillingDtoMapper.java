package com.fitme.billing.service;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.entity.BillingPlan;
import org.springframework.stereotype.Component;

@Component
public class BillingDtoMapper {

    public BillingPlanDto toDto(BillingPlan plan) {
        return BillingPlanDto.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .name(plan.getName())
                .planType(plan.getPlanType())
                .priceVnd(plan.getPriceVnd())
                .quotaAmount(plan.getQuotaAmount())
                .includesDashboard(plan.isIncludesDashboard())
                .billingPeriodDays(plan.getBillingPeriodDays())
                .active(plan.isActive())
                .sortOrder(plan.getSortOrder())
                .build();
    }
}
