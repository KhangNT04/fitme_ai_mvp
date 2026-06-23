package com.fitme.brand.controller;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand")
@RequiredArgsConstructor
public class BrandDashboardController {

    private final BrandService brandService;
    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(analyticsService.brandDashboard(brandId));
    }

    @GetMapping("/analytics/redirect")
    public ApiResponse<Map<String, Object>> redirect(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(analyticsService.brandRedirectAnalytics(brandId));
    }

    @GetMapping("/analytics/dropoff")
    public ApiResponse<Map<String, Object>> dropoff(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(analyticsService.brandDropoff(brandId));
    }

    @GetMapping("/analytics/hesitation")
    public ApiResponse<Map<String, Object>> hesitation(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(analyticsService.brandHesitation(brandId));
    }

    @GetMapping("/analytics/try-on")
    public ApiResponse<Map<String, Object>> tryOn(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(analyticsService.brandTryOnAnalytics(brandId));
    }

    @GetMapping("/products/{id}/analytics")
    public ApiResponse<Map<String, Object>> productAnalytics(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                             @PathVariable UUID id) {
        UUID brandId = brandService.getBrandForOwner(principal.getUserId()).getId();
        return ApiResponse.ok(analyticsService.productAnalytics(brandId, id));
    }
}
