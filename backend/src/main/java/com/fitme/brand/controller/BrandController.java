package com.fitme.brand.controller;

import com.fitme.brand.dto.BrandOnboardingRequest;
import com.fitme.brand.dto.BrandResponse;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/brand")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @PostMapping("/onboarding")
    public ApiResponse<BrandResponse> onboard(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                              @Valid @RequestBody BrandOnboardingRequest request) {
        return ApiResponse.ok(brandService.onboard(principal.getUserId(), request));
    }

    @GetMapping("/me")
    public ApiResponse<BrandResponse> getMe(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(brandService.getMyBrand(principal.getUserId()));
    }

    @PutMapping("/me")
    public ApiResponse<BrandResponse> updateMe(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                               @Valid @RequestBody BrandOnboardingRequest request) {
        return ApiResponse.ok(brandService.updateMyBrand(principal.getUserId(), request));
    }
}
