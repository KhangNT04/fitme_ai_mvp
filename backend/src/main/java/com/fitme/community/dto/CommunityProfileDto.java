package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

/** Community activity of the signed-in user: posts published, saves, followers, following. */
@Data
@Builder
public class CommunityProfileDto {
    private int publishedPosts;
    private int savedPosts;
    private int followers;
    private int following;
    private int totalLikesReceived;
    /**
     * The user's own public author key, so they can open their community profile page.
     *
     * <p>It is the same random key used in public author URLs — never the account id.
     */
    private String authorKey;
}
