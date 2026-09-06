package com.fitme.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 6, message = "Mật khẩu tối thiểu 6 ký tự")
    private String password;

    @JsonAlias("fullName")
    private String displayName;

    /** Honeypot — must stay empty. Bots that fill hidden fields are rejected. */
    private String website;

    @NotBlank(message = "Thiếu mã captcha")
    private String captchaId;

    @NotBlank(message = "Nhập đáp án xác nhận")
    private String captchaAnswer;

    /** Epoch millis when the form was first shown (anti-bot timing). */
    private Long formStartedAtMs;
}
