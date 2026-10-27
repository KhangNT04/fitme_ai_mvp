package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * A comment on a community post. Like the post DTO it never carries the author's email or
 * account id, so a comment thread can be shown to guests without leaking personal data.
 */
@Data
@Builder
public class CommunityCommentDto {
    private UUID id;
    private UUID postId;
    private String content;
    private String authorDisplayName;
    private String authorInitials;
    /** Whether the signed-in viewer wrote this comment. */
    private boolean mine;
    /** Whether the signed-in viewer may delete it (own comment, or own post). */
    private boolean canDelete;
    /** The comment being answered, when this is a reply. */
    private UUID parentId;
    /** Display name of the comment being answered, when this is a reply. */
    private String parentAuthorDisplayName;
    private Instant createdAt;
    /** Replies to this comment, one level deep. */
    private List<CommunityCommentDto> replies;
}
