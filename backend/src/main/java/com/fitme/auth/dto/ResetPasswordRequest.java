package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank
    private String token;

    @NotBlank
    @Size(min = 8, max = 100, message = "Mật khẩu mới cần từ 8 đến 100 ký tự")
    private String newPassword;
}
