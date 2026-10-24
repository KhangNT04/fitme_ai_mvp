package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

/** Admin overview of the community: posts, authors and engagement. */
@Data
@Builder
public class CommunityStatsDto {
    private long totalPosts;
    private long postsLast7Days;
    private long authorsWithPosts;
    private long totalLikes;
    private long totalViews;
}
