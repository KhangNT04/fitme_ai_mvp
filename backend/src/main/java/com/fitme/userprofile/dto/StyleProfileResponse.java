package com.fitme.userprofile.dto;

import com.fitme.common.enums.RiskLevel;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class StyleProfileResponse {
    private UUID id;
    private String primaryStyle;
    private List<String> secondaryStyles;
    private RiskLevel riskLevel;
    private boolean artisticMode;
    private List<String> preferredColors;
    private List<String> avoidedColors;
    private Instant updatedAt;
}
