package com.fitme.auth.controller;

import com.fitme.auth.dto.TwoFactorDtos;
import com.fitme.auth.dto.TwoFactorRequest;
import com.fitme.auth.service.AuthService;
import com.fitme.auth.service.TwoFactorService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/2fa")
@RequiredArgsConstructor
public class TwoFactorController {

    private final TwoFactorService twoFactorService;
    private final AuthService authService;

    @GetMapping
    public ApiResponse<TwoFactorDtos.Status> status() {
        return ApiResponse.ok(twoFactorService.status(RequestContext.requireUserId()));
    }

    @PostMapping("/setup")
    public ApiResponse<TwoFactorDtos.Setup> setup() {
        return ApiResponse.ok(twoFactorService.beginSetup(RequestContext.requireUserId()));
    }

    @PostMapping("/enable")
    public ApiResponse<TwoFactorDtos.Enabled> enable(@Valid @RequestBody TwoFactorRequest request) {
        UUID userId = RequestContext.requireUserId();
        List<String> codes = twoFactorService.enable(userId, request.password(), request.code());
        return ApiResponse.ok(new TwoFactorDtos.Enabled(codes,
                authService.issueSession(userId, true, request.refreshToken())));
    }

    @PostMapping("/disable")
    public ApiResponse<Void> disable(@Valid @RequestBody TwoFactorRequest request) {
        twoFactorService.disable(RequestContext.requireUserId(), request.password(), request.code());
        return ApiResponse.ok(null);
    }

    @PostMapping("/recovery-codes")
    public ApiResponse<TwoFactorDtos.RecoveryCodes> regenerateRecoveryCodes(@Valid @RequestBody TwoFactorRequest request) {
        return ApiResponse.ok(new TwoFactorDtos.RecoveryCodes(twoFactorService.regenerateRecoveryCodes(
                RequestContext.requireUserId(), request.password(), request.code())));
    }
}
