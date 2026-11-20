package com.fitme.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCommunityReportRequest {
    @NotBlank
    @Size(max = 32)
    private String targetType;

    @NotNull
    private UUID targetId;

    @NotBlank
    @Size(max = 64)
    private String reason;

    @Size(max = 1000)
    private String detail;
}
