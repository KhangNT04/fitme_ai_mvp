package com.fitme.billing.service;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.dto.ConsumerBillingOrderDto;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.entity.ConsumerBillingOrder;
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
                .fitkenAmount(plan.getQuotaAmount())
                .billingPeriodDays(plan.getBillingPeriodDays())
                .active(plan.isActive())
                .sortOrder(plan.getSortOrder())
                .build();
    }

    public ConsumerBillingOrderDto toDto(ConsumerBillingOrder order, BillingPlan plan) {
        return ConsumerBillingOrderDto.builder()
                .orderId(order.getId())
                .payosOrderCode(order.getPayosOrderCode())
                .planId(order.getPlanId())
                .planName(plan != null ? plan.getName() : null)
                .amountVnd(order.getAmountVnd())
                .status(order.getStatus())
                .checkoutUrl(order.getCheckoutUrl())
                .createdAt(order.getCreatedAt())
                .paidAt(order.getPaidAt())
                .build();
    }
}
