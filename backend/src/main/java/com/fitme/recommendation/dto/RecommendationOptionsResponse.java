package com.fitme.recommendation.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class RecommendationOptionsResponse {
    private UUID requestId;
    private List<StyleOptionDto> options;

    @Data
    @Builder
    public static class StyleOptionDto {
        private UUID recommendationId;
        private String styleLabel;
        private String title;
        private String previewImageUrl;
        private int itemCount;
        private String stylistSource;
    }
}
