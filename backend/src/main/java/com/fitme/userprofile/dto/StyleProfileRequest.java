package com.fitme.userprofile.dto;

import com.fitme.common.enums.RiskLevel;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class StyleProfileRequest {
    @NotBlank(message = "Primary style là bắt buộc")
    private String primaryStyle;
    private List<String> secondaryStyles;
    private RiskLevel riskLevel;
    private Boolean artisticMode;
    private List<String> preferredColors;
    private List<String> avoidedColors;
}
