package com.fitme.stylistchat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class StylistConversationDto {
    private UUID id;
    private String title;
    private Instant updatedAt;
    private List<StylistMessageDto> messages;

    @Data
    @Builder
    public static class StylistMessageDto {
        private UUID id;
        private String role;
        private String type;
        private String content;
        private UUID outfitRequestId;
        private Instant createdAt;
    }
}
