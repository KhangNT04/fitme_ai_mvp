package com.fitme.auth.controller;

import com.fitme.auth.dto.AuthResponse;
import com.fitme.auth.dto.ChangePasswordRequest;
import com.fitme.auth.service.AuthService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/password")
@RequiredArgsConstructor
public class AccountController {

    private final AuthService authService;

    @PostMapping
    public ApiResponse<AuthResponse> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return ApiResponse.ok(authService.changePassword(RequestContext.requireUserId(), request));
    }
}
