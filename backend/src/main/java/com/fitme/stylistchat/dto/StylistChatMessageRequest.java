package com.fitme.stylistchat.dto;

import com.fitme.common.enums.WardrobeMode;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class StylistChatMessageRequest {
    private String message;
    private UUID conversationId;
    private List<ChatHistoryItem> history;
    private UUID selectedProductId;
    private WardrobeMode wardrobeMode;

    @Data
    public static class ChatHistoryItem {
        private String role;
        private String content;
    }
}
