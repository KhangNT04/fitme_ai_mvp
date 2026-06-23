package com.fitme.userprofile.dto;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.SkinTone;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class BodyProfileResponse {
    private UUID id;
    private Integer heightCm;
    private BigDecimal weightKg;
    private FitPreference fitPreference;
    private SkinTone skinTone;
    private Map<String, Object> goals;
    private BigDecimal shoulderWidthCm;
    private BigDecimal chestCm;
    private BigDecimal waistCm;
    private BigDecimal abdomenCm;
    private BigDecimal hipCm;
    private BigDecimal thighCm;
    private BigDecimal inseamCm;
    private BigDecimal armLengthCm;
    private Instant updatedAt;
}
