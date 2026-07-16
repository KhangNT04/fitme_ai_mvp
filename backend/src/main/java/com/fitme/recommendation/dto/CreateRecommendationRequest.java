package com.fitme.recommendation.dto;

import com.fitme.common.enums.WardrobeMode;
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
    /** Free-text user prompt from stylist chat. */
    private String userMessage;
    private UUID conversationId;
    /** Optional style labels to generate (chat intent). Falls back to catalog defaults. */
    private java.util.List<String> styleLabels;
    /** Compact conversation history for follow-ups. */
    private java.util.List<String> conversationHistory;
}
