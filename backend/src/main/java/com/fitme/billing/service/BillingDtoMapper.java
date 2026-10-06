package com.fitme.billing.service;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.dto.ConsumerBillingOrderDto;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.entity.ConsumerBillingOrder;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class BillingDtoMapper {

    private final AppClock clock;

    public BillingPlanDto toDto(BillingPlan plan) {
        Instant now = clock.now();
        return BillingPlanDto.builder()
                .id(plan.getId())
                .code(plan.getCode())
                .name(plan.getName())
                .planType(plan.getPlanType())
                .audience(plan.getAudience())
                .priceVnd(plan.getPriceVnd())
                .fitkenAmount(plan.getQuotaAmount())
                .billingPeriodDays(plan.getBillingPeriodDays())
                .active(plan.isActive())
                .sortOrder(plan.getSortOrder())
                .discountPercent(plan.getDiscountPercent())
                .discountStartsAt(plan.getDiscountStartsAt())
                .discountEndsAt(plan.getDiscountEndsAt())
                .discountActive(PlanPricing.isDiscountActive(plan, now))
                .effectivePriceVnd(PlanPricing.effectivePrice(plan, now))
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
