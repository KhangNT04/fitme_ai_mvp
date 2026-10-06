package com.fitme.settings.controller;

import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.settings.dto.SystemSettingDto;
import com.fitme.settings.dto.UpdateSystemSettingRequest;
import com.fitme.settings.service.SystemSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminSystemSettingsController {

    private final SystemSettingsService settingsService;

    @GetMapping
    public ApiResponse<List<SystemSettingDto>> list() {
        return ApiResponse.ok(settingsService.list());
    }

    @PutMapping("/{key}")
    public ApiResponse<SystemSettingDto> update(@PathVariable String key,
                                                @Valid @RequestBody UpdateSystemSettingRequest request,
                                                @AuthenticationPrincipal FitMeUserPrincipal principal) {
        return ApiResponse.ok(settingsService.update(key, request.getValue(),
                principal != null ? principal.getUserId() : null));
    }
}
