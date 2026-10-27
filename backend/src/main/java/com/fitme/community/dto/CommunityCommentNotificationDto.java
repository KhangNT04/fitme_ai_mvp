package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/** A comment notification: somebody replied to the viewer's post or comment. */
@Data
@Builder
public class CommunityCommentNotificationDto {
    private UUID id;
    private UUID postId;
    private String postShareCode;
    private String postTitle;
    private String actorDisplayName;
    private String actorInitials;
    private String content;
    private boolean reply;
    private java.time.LocalDateTime createdAt;
}
