package com.fitme.billing.controller;

import com.fitme.admin.dto.AdminBrandListItemDto;
import com.fitme.admin.service.AdminBrandListService;
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
    private final AdminBrandListService adminBrandListService;

    @GetMapping("/plans")
    public ApiResponse<List<BillingPlanDto>> listPlans() {
        return ApiResponse.ok(billingPlanService.listAll());
    }

    @GetMapping("/plans/{id}")
    public ApiResponse<BillingPlanDto> getPlan(@PathVariable UUID id) {
        return ApiResponse.ok(billingPlanService.get(id));
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

    @GetMapping("/brands")
    public ApiResponse<List<AdminBrandListItemDto>> listBrandBilling() {
        return ApiResponse.ok(adminBrandListService.listBrandsWithBilling());
    }

    @GetMapping("/brands/{brandId}")
    public ApiResponse<AdminBrandBillingDetailDto> brandBilling(@PathVariable UUID brandId) {
        return ApiResponse.ok(brandBillingService.getAdminDetail(brandId));
    }

    @PostMapping("/brands/{brandId}/adjust")
    public ApiResponse<AdminBrandBillingDetailDto> adjustQuota(@PathVariable UUID brandId,
                                                               @Valid @RequestBody QuotaAdjustRequest request) {
        brandQuotaService.adjustQuota(brandId, request.getSubscriptionDelta(), request.getTopupDelta(),
                request.getNote());
        return ApiResponse.ok(brandBillingService.getAdminDetail(brandId));
    }

    @PostMapping("/brands/{brandId}/deactivate")
    public ApiResponse<AdminBrandBillingDetailDto> deactivateBrandBilling(
            @PathVariable UUID brandId,
            @RequestBody(required = false) BrandBillingDeactivateRequest request) {
        String note = request != null ? request.getNote() : null;
        brandQuotaService.deactivateBrandBilling(brandId, note);
        return ApiResponse.ok(brandBillingService.getAdminDetail(brandId));
    }
}
