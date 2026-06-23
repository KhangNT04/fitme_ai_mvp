package com.fitme.userprofile.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.userprofile.dto.BodyProfileRequest;
import com.fitme.userprofile.dto.BodyProfileResponse;
import com.fitme.userprofile.dto.StyleProfileRequest;
import com.fitme.userprofile.dto.StyleProfileResponse;
import com.fitme.userprofile.service.BodyProfileService;
import com.fitme.userprofile.service.StyleProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class ProfileController {

    private final BodyProfileService bodyProfileService;
    private final StyleProfileService styleProfileService;

    @PostMapping("/body-profile")
    public ApiResponse<BodyProfileResponse> createBodyProfile(@Valid @RequestBody BodyProfileRequest request) {
        return ApiResponse.ok(bodyProfileService.create(request));
    }

    @GetMapping("/body-profile")
    public ApiResponse<BodyProfileResponse> getBodyProfile() {
        return ApiResponse.ok(bodyProfileService.get());
    }

    @PutMapping("/body-profile")
    public ApiResponse<BodyProfileResponse> updateBodyProfile(@Valid @RequestBody BodyProfileRequest request) {
        return ApiResponse.ok(bodyProfileService.update(request));
    }

    @DeleteMapping("/body-profile")
    public ApiResponse<Void> deleteBodyProfile() {
        bodyProfileService.delete();
        return ApiResponse.ok(null);
    }

    @PostMapping("/style-profile")
    public ApiResponse<StyleProfileResponse> createStyleProfile(@Valid @RequestBody StyleProfileRequest request) {
        return ApiResponse.ok(styleProfileService.create(request));
    }

    @GetMapping("/style-profile")
    public ApiResponse<StyleProfileResponse> getStyleProfile() {
        return ApiResponse.ok(styleProfileService.get());
    }

    @PutMapping("/style-profile")
    public ApiResponse<StyleProfileResponse> updateStyleProfile(@Valid @RequestBody StyleProfileRequest request) {
        return ApiResponse.ok(styleProfileService.update(request));
    }

    @DeleteMapping("/style-profile")
    public ApiResponse<Void> deleteStyleProfile() {
        styleProfileService.delete();
        return ApiResponse.ok(null);
    }
}
