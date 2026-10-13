package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Sensitive 2FA changes need the current password and a code from the authenticator (or a recovery code). */
public record TwoFactorRequest(
        @NotBlank(message = "Nhập mật khẩu hiện tại") String password,
        @NotBlank(message = "Nhập mã xác thực") @Size(max = 20) String code,
        /** Optional: the caller's refresh token, revoked when new tokens are issued. */
        String refreshToken) {
}
