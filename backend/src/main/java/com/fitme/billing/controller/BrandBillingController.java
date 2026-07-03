package com.fitme.billing.controller;

import com.fitme.billing.dto.*;
import com.fitme.billing.service.BillingPlanService;
import com.fitme.billing.service.BrandBillingService;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/billing")
@RequiredArgsConstructor
public class BrandBillingController {

    private final BrandService brandService;
    private final BrandBillingService brandBillingService;
    private final BillingPlanService billingPlanService;

    @GetMapping("/summary")
    public ApiResponse<BrandBillingSummaryDto> summary(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(brandBillingService.getSummary(brandId));
    }

    @GetMapping("/plans")
    public ApiResponse<List<BillingPlanDto>> plans() {
        return ApiResponse.ok(billingPlanService.listActive());
    }

    @PostMapping("/checkout")
    public ApiResponse<CheckoutResponse> checkout(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                  @Valid @RequestBody CheckoutRequest request) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(brandBillingService.createCheckout(brandId, request.getPlanId()));
    }
}
