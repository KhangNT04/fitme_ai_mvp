package com.fitme.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TokenRequest {
    /** 6-digit confirmation code. */
    @NotBlank
    private String token;

    @NotBlank
    private String email;
}
