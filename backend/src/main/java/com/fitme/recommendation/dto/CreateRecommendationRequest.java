package com.fitme.recommendation.dto;

import com.fitme.common.enums.WardrobeMode;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateRecommendationRequest {
    private UUID sessionId;
    private UUID selectedProductId;
    private String occasion;
    private String desiredVibe;
    private WardrobeMode wardrobeMode;
    private BigDecimal budgetMin;
    private BigDecimal budgetMax;
}
