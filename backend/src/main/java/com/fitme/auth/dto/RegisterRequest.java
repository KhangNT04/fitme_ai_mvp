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

    @NotBlank @Size(min = 6, max = 100, message = "Mật khẩu cần từ 6 đến 100 ký tự")
    private String password;

    @JsonAlias("fullName")
    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    private String displayName;

    /** Honeypot — must stay empty. Bots that fill hidden fields are rejected. */
    private String website;

    @NotBlank(message = "Thiếu mã captcha")
    private String captchaId;

    @NotBlank(message = "Nhập đáp án xác nhận")
    private String captchaAnswer;

    /** Epoch millis when the form was first shown (anti-bot timing). */
    private Long formStartedAtMs;

    /** First-touch attribution captured by the frontend; longer values are truncated server-side. */
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private String referrer;
}
