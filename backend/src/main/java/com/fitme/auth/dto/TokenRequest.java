package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TokenRequest {
    /** Verification / reset token or 6-digit confirmation code. */
    @NotBlank
    private String token;

    /** Optional email when verifying with a short code. */
    private String email;
}
