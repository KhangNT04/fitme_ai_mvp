package com.fitme.billing.controller;

import com.fitme.billing.dto.*;
import com.fitme.billing.service.BillingPlanService;
import com.fitme.billing.service.BrandBillingService;
import com.fitme.billing.service.BrandQuotaService;
import com.fitme.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/billing")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminBillingController {

    private final BillingPlanService billingPlanService;
    private final BrandBillingService brandBillingService;
    private final BrandQuotaService brandQuotaService;

    @GetMapping("/plans")
    public ApiResponse<List<BillingPlanDto>> listPlans() {
        return ApiResponse.ok(billingPlanService.listAll());
    }

    @PostMapping("/plans")
    public ApiResponse<BillingPlanDto> createPlan(@Valid @RequestBody BillingPlanRequest request) {
        return ApiResponse.ok(billingPlanService.create(request));
    }

    @PutMapping("/plans/{id}")
    public ApiResponse<BillingPlanDto> updatePlan(@PathVariable UUID id,
                                                  @Valid @RequestBody BillingPlanRequest request) {
        return ApiResponse.ok(billingPlanService.update(id, request));
    }

    @DeleteMapping("/plans/{id}")
    public ApiResponse<Void> deletePlan(@PathVariable UUID id) {
        billingPlanService.delete(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/brands/{brandId}")
    public ApiResponse<BrandBillingSummaryDto> brandBilling(@PathVariable UUID brandId) {
        return ApiResponse.ok(brandBillingService.getSummary(brandId));
    }

    @PostMapping("/brands/{brandId}/adjust")
    public ApiResponse<BrandBillingSummaryDto> adjustQuota(@PathVariable UUID brandId,
                                                           @Valid @RequestBody QuotaAdjustRequest request) {
        brandQuotaService.adjustQuota(brandId, request.getSubscriptionDelta(), request.getTopupDelta(),
                request.getNote());
        return ApiResponse.ok(brandBillingService.getSummary(brandId));
    }
}
