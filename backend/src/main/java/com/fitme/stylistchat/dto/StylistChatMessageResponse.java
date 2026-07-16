package com.fitme.stylistchat.dto;

import com.fitme.recommendation.dto.RecommendationOptionsResponse;
import com.fitme.recommendation.dto.RecommendationResponse;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class StylistChatMessageResponse {
    private UUID conversationId;
    private AssistantMessageDto assistantMessage;
    private List<RecommendationResponse> recommendations;
    private UUID requestId;

    @Data
    @Builder
    public static class AssistantMessageDto {
        private String type;
        private String content;
        private List<RecommendationOptionsResponse.StyleOptionDto> options;
    }
}
