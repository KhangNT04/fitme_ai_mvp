package com.fitme.auth.controller;

import com.fitme.auth.dto.AuthResponse;
import com.fitme.auth.dto.ChangePasswordRequest;
import com.fitme.auth.dto.UpdateDisplayNameRequest;
import com.fitme.auth.service.AuthService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class AccountController {

    private final AuthService authService;

    @PostMapping("/password")
    public ApiResponse<AuthResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ApiResponse.ok(authService.changePassword(RequestContext.requireUserId(), request));
    }

    /** Renames the account from the profile page; returns the refreshed session data. */
    @PutMapping("/display-name")
    public ApiResponse<AuthResponse> updateDisplayName(@Valid @RequestBody UpdateDisplayNameRequest request) {
        return ApiResponse.ok(authService.updateDisplayName(RequestContext.requireUserId(), request));
    }
}
