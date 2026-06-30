package com.fitme.userprofile.dto;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.Gender;
import com.fitme.common.enums.SkinTone;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Data
public class BodyProfileRequest {
    @NotNull @Min(100) @Max(230)
    private Integer heightCm;
    @NotNull @DecimalMin("25") @DecimalMax("250")
    private BigDecimal weightKg;
    @NotNull
    private Gender gender;
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
}
