package com.fitme.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Step 1 of the self-service sign-in email change: prove ownership of the account. */
@Data
public class ChangeEmailRequest {
    @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại")
    private String currentPassword;

    @NotBlank(message = "Vui lòng nhập email mới")
    @Email(message = "Email mới không hợp lệ")
    @Size(max = 255, message = "Email quá dài")
    private String newEmail;
}
