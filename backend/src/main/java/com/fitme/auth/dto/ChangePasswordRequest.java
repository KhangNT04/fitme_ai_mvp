package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {
    @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại")
    private String currentPassword;

    @NotBlank
    @Size(min = 8, max = 100, message = "Mật khẩu mới cần từ 8 đến 100 ký tự")
    private String newPassword;

    /** The caller's refresh token, revoked so only the tokens returned by this call stay usable. */
    private String refreshToken;
}
