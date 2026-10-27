package com.fitme.notification;

import java.util.UUID;

/**
 * Somebody commented on a community post (or replied to a comment). {@code recipientId} is the
 * person to notify — the post author, or the author of the comment that was answered.
 */
public record CommunityCommentEvent(
        UUID commentId,
        UUID postId,
        UUID recipientId,
        UUID actorId,
        UUID parentId,
        boolean reply) {

    public static CommunityCommentEvent of(UUID commentId, UUID postId, UUID recipientId, UUID actorId,
                                          UUID parentId, boolean reply) {
        return new CommunityCommentEvent(commentId, postId, recipientId, actorId, parentId, reply);
    }
}
