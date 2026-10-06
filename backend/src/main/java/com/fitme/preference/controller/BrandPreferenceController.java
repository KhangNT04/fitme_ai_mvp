package com.fitme.preference.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.preference.dto.BrandPreferenceRequest;
import com.fitme.preference.dto.BrandPreferenceResponse;
import com.fitme.preference.service.BrandPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/brand-preferences")
@RequiredArgsConstructor
public class BrandPreferenceController {

    private final BrandPreferenceService brandPreferenceService;

    @GetMapping
    public ApiResponse<BrandPreferenceResponse> get(@AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(brandPreferenceService.get(principal.getUserId()));
    }

    @PutMapping
    public ApiResponse<BrandPreferenceResponse> update(@AuthenticationPrincipal FitMeUserPrincipal principal,
                                                       @RequestBody BrandPreferenceRequest request) {
        return ApiResponse.ok(brandPreferenceService.update(principal.getUserId(), request));
    }
}
