package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

/** Result of a like/save toggle: the post id, the new counters and the viewer's new state. */
@Data
@Builder
public class CommunityPostInteractionDto {
    private java.util.UUID postId;
    private int likeCount;
    private int commentCount;
    private boolean likedByMe;
    private boolean savedByMe;
}
