package com.fitme.auth.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AuthResponse {
    private UUID userId;
    private String email;
    private String displayName;
    private String role;
    private String accessToken;
    private String refreshToken;
    private boolean emailVerified;
    /** True when register succeeded but email confirmation is still required. */
    private boolean requiresEmailVerification;
    /**
     * One-time confirmation code for MVP without SMTP.
     * Only populated when fitme.auth.expose-verification-code=true.
     */
    private String verificationCode;
    private String message;
    /** FREE | PLUS — consumer entitlement stub until PayOS billing. */
    private String consumerPlan;
}
