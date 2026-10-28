package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

/**
 * The public community profile of an author.
 *
 * <p>Like the posts themselves, it carries only a display name and counters — never the
 * account id, the email or anything else that identifies the person behind the screen.
 */
@Data
@Builder
public class CommunityAuthorDto {
    /** Public, random identifier used in the profile URL. */
    private String authorKey;
    private String displayName;
    private String initials;
    /** Number of public posts. */
    private long publishedPosts;
    /** Total likes received across the public posts. */
    private long totalLikes;
    /** Total comments written on the public posts. */
    private long totalComments;
    /** True when the signed-in viewer follows this author. */
    private boolean followedByMe;
}
