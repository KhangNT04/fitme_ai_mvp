package com.fitme.recommendation.dto;

import com.fitme.common.enums.Confidence;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.SourceType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RecommendationResponse {
    private UUID recommendationId;
    private String title;
    private String recommendedSize;
    private String alternativeSize;
    private String recommendedForm;
    private String recommendedColor;
    private Confidence confidence;
    private String stylistSource;
    private List<OutfitItemDto> outfitItems;
    private ExplanationDto explanation;
    private PreviewDto preview;

    @Data
    @Builder
    public static class OutfitItemDto {
        private UUID productId;
        private UUID wardrobeItemId;
        private ItemRole role;
        private SourceType sourceType;
        private String displayName;
        private String selectedSize;
        private String selectedColor;
        private BigDecimal price;
        private boolean canBuy;
        private String imageUrl;
    }

    @Data
    @Builder
    public static class ExplanationDto {
        private String summary;
        private String bodyFit;
        private String styleFit;
        private String occasionFit;
        private String colorFit;
        private String wardrobeFit;
    }

    @Data
    @Builder
    public static class PreviewDto {
        private String type;
        private String imageUrl;
        private String disclaimer;
    }
}
