package com.fitme.stylistchat.dto;

import com.fitme.common.enums.WardrobeMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class StylistChatMessageRequest {
    public static final int MAX_MESSAGE_LENGTH = 1000;

    @NotBlank(message = "Vui lòng nhập tin nhắn")
    @Size(max = MAX_MESSAGE_LENGTH, message = "Tin nhắn tối đa 1000 ký tự")
    private String message;
    private UUID conversationId;
    @Size(max = 20, message = "Lịch sử hội thoại quá dài")
    @Valid
    private List<ChatHistoryItem> history;
    private UUID selectedProductId;
    private WardrobeMode wardrobeMode;

    @Data
    public static class ChatHistoryItem {
        private String role;
        @Size(max = 4000, message = "Nội dung lịch sử quá dài")
        private String content;
    }
}
