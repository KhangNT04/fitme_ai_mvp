package com.fitme.ai.dto;

import com.fitme.common.enums.Confidence;
import com.fitme.recommendation.dto.RecommendationResponse;

import java.util.List;

public record GeminiStylistResult(
        String title,
        List<RecommendationResponse.OutfitItemDto> items,
        String recommendedSize,
        String alternativeSize,
        String recommendedForm,
        String recommendedColor,
        Confidence confidence,
        String explanationBody,
        String explanationStyle,
        String explanationOccasion,
        String explanationColor,
        String explanationWardrobe
) {
}
