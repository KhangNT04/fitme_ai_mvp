package com.fitme.rewards.service;

import java.util.UUID;

/**
 * Lets the rewards module check who owns a community post without depending on the community
 * module directly — the community package stays the only owner of its own tables.
 */
public interface CommunityPostOwnership {

    /** True when the post with this public share code was published by the given user. */
    boolean isOwnedByShareCode(String shareCode, UUID userId);
}
