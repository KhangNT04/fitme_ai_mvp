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
}
