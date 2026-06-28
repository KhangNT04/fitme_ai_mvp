package com.fitme.brand.controller;

import com.fitme.brand.dto.BrandApplicationResponse;
import com.fitme.brand.dto.BrandOnboardingRequest;
import com.fitme.brand.dto.BrandResponse;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/brand/applications")
@RequiredArgsConstructor
public class BrandApplicationController {

    private final BrandService brandService;

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ApiResponse<BrandResponse> apply(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                            @Valid @RequestBody BrandOnboardingRequest request) {
        return ApiResponse.ok(brandService.applyForBrand(principal.getUserId(), request));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('USER', 'BRAND_OWNER')")
    public ApiResponse<BrandApplicationResponse> myApplication(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(brandService.getMyApplication(principal.getUserId()));
    }
}
