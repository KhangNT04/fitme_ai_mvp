package com.fitme.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/** Hands an account over to its real owner: new sign-in email and/or password. Omitted fields are kept. */
public record AdminCredentialsRequest(
        @Email(message = "Email không hợp lệ") @Size(max = 255) String email,
        @Size(min = 8, max = 100, message = "Mật khẩu mới cần từ 8 đến 100 ký tự") String password) {
}
