package com.fitme.billing.controller;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.dto.BillingPlanRequest;
import com.fitme.billing.service.BillingPlanService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.PlanAudience;
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

    @GetMapping("/plans")
    public ApiResponse<List<BillingPlanDto>> listPlans(@RequestParam(required = false) PlanAudience audience) {
        return ApiResponse.ok(billingPlanService.listAll(audience));
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
}
