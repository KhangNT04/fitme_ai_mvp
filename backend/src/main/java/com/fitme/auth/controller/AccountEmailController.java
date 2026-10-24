package com.fitme.auth.controller;

import com.fitme.auth.dto.AuthResponse;
import com.fitme.auth.dto.ChangeEmailRequest;
import com.fitme.auth.dto.ConfirmEmailChangeRequest;
import com.fitme.auth.dto.EmailChangeStatusDto;
import com.fitme.auth.service.AccountEmailChangeService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.security.RequestContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-service change of the sign-in email: confirm the password, then confirm the new address.
 * The account keeps signing in with the old email until the code is confirmed.
 */
@RestController
@RequestMapping("/api/v1/me/email")
@RequiredArgsConstructor
public class AccountEmailController {

    private final AccountEmailChangeService emailChangeService;

    @GetMapping
    public ApiResponse<EmailChangeStatusDto> status() {
        return ApiResponse.ok(emailChangeService.status(RequestContext.requireUserId()));
    }

    /** Step 1: current password + new email; mails a 6-digit code to the new address. */
    @PostMapping("/request")
    public ApiResponse<EmailChangeStatusDto> requestEmailChange(@Valid @RequestBody ChangeEmailRequest request) {
        return ApiResponse.ok(emailChangeService.requestEmailChange(RequestContext.requireUserId(), request));
    }

    /** Step 2: the code; applies the new email and returns a fresh session. */
    @PostMapping("/confirm")
    public ApiResponse<AuthResponse> confirmEmailChange(@Valid @RequestBody ConfirmEmailChangeRequest request) {
        return ApiResponse.ok(emailChangeService.confirmEmailChange(RequestContext.requireUserId(), request));
    }

    /** Abandons a pending change. */
    @DeleteMapping("/pending")
    public ApiResponse<EmailChangeStatusDto> cancelEmailChange() {
        return ApiResponse.ok(emailChangeService.cancelEmailChange(RequestContext.requireUserId()));
    }
}
