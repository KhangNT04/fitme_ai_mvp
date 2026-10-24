package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

/** Result of publishing a post: the post itself and the public link to share. */
@Data
@Builder
public class CreateCommunityPostResult {
    private CommunityPostDto post;
    private String shareUrl;
}
