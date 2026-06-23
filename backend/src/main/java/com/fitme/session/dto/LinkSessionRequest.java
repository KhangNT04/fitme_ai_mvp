package com.fitme.session.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LinkSessionRequest {
    @NotBlank(message = "Session token là bắt buộc")
    private String sessionToken;
}
