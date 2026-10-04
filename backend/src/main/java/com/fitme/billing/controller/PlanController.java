package com.fitme.billing.controller;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.service.BillingPlanService;
import com.fitme.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/plans")
@RequiredArgsConstructor
public class PlanController {

    private final BillingPlanService billingPlanService;

    @GetMapping
    public ApiResponse<List<BillingPlanDto>> activePlans() {
        return ApiResponse.ok(billingPlanService.listActive());
    }
}
