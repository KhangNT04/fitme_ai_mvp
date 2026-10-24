package com.fitme.billing.controller;

import com.fitme.billing.dto.PricingVisibilityDto;
import com.fitme.billing.service.BillingPlanService;
import com.fitme.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public flags so the consumer app knows whether the paid plans are currently shown. */
@RestController
@RequestMapping("/api/v1/pricing")
@RequiredArgsConstructor
public class PricingVisibilityController {

    private final BillingPlanService billingPlanService;

    @GetMapping("/visibility")
    public ApiResponse<PricingVisibilityDto> visibility() {
        return ApiResponse.ok(new PricingVisibilityDto(billingPlanService.pricingVisible()));
    }
}
