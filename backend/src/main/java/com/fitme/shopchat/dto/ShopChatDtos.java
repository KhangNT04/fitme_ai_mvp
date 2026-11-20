package com.fitme.shopchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ShopChatDtos {
    private ShopChatDtos() {}

    @Data
    public static class OpenThreadRequest {
        private UUID brandId;
        private UUID productId;
        private UUID tryOnRequestId;
        private UUID communityPostId;
        @Size(max = 2000)
        private String firstMessage;
    }

    @Data
    public static class SendMessageRequest {
        @NotBlank
        @Size(max = 2000)
        private String body;
    }

    @Data
    @Builder
    public static class ThreadDto {
        private UUID id;
        private UUID brandId;
        private String brandName;
        private UUID userId;
        private String userDisplayName;
        private UUID productId;
        private String productName;
        private String productImageUrl;
        private String status;
        private String lastMessagePreview;
        private Instant lastMessageAt;
        private int unreadCount;
        private Instant createdAt;
    }

    @Data
    @Builder
    public static class MessageDto {
        private UUID id;
        private UUID threadId;
        private UUID senderUserId;
        private String senderRole;
        private String senderDisplayName;
        private String body;
        private Instant createdAt;
    }

    @Data
    @Builder
    public static class ThreadDetailDto {
        private ThreadDto thread;
        private List<MessageDto> messages;
    }
}
