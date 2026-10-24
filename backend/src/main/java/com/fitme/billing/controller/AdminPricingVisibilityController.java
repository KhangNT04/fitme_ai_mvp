package com.fitme.billing.controller;

import com.fitme.billing.dto.PricingVisibilityDto;
import com.fitme.billing.service.BillingPlanService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Admin switch that shows or hides every paid consumer plan for users. */
@RestController
@RequestMapping("/api/v1/admin/pricing")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPricingVisibilityController {

    private final BillingPlanService billingPlanService;

    @GetMapping("/visibility")
    public ApiResponse<PricingVisibilityDto> visibility() {
        return ApiResponse.ok(new PricingVisibilityDto(billingPlanService.pricingVisible()));
    }

    /** Body: {@code {"showPaid": true|false}}. */
    @PutMapping("/visibility")
    public ApiResponse<PricingVisibilityDto> setVisibility(@RequestBody Map<String, Boolean> body,
                                                          @AuthenticationPrincipal FitMeUserPrincipal principal) {
        boolean showPaid = Boolean.TRUE.equals(body.get("showPaid"));
        billingPlanService.setPricingVisible(showPaid, principal != null ? principal.getUserId() : null);
        return ApiResponse.ok(new PricingVisibilityDto(showPaid));
    }
}
