package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TwoFactorLoginRequest(
        @NotBlank String twoFactorToken,
        @NotBlank(message = "Nhập mã xác thực") @Size(max = 20) String code) {
}
