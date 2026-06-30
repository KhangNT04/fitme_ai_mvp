package com.fitme.brand.controller;

import com.fitme.brand.dto.BrandOnboardingRequest;
import com.fitme.brand.dto.BrandResponse;
import com.fitme.brand.service.BrandService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import com.fitme.brand.dto.MediaUploadResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

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

    @PostMapping("/me/logo")
    public ApiResponse<BrandResponse> uploadLogo(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                 @RequestParam("file") MultipartFile file) throws IOException {
        return ApiResponse.ok(brandService.uploadLogo(principal.getUserId(), file));
    }

    @PostMapping("/media/images")
    public ApiResponse<MediaUploadResponse> uploadProductImage(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                               @RequestParam("file") MultipartFile file) throws IOException {
        return ApiResponse.ok(brandService.uploadProductImage(principal.getUserId(), file));
    }
}
