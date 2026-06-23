package com.fitme.tryon.dto;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.SkinTone;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateTryOnRequest {
    private UUID photoUploadId;
    private String occasion;
    private String desiredVibe;
    private FitPreference preferredFit;
    private String comfortPreference;
    private String normallyWornTopSize;
    private String normallyWornBottomSize;
    private Integer heightCm;
    private BigDecimal weightKg;
    private SkinTone skinTone;
}
