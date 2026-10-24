package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Public shape of a community post. Deliberately omits the author's email and account id so a
 * feed response can never leak personal data to other users.
 */
@Data
@Builder
public class CommunityPostDto {
    private UUID id;
    /** Public code used in the share URL, e.g. {@code /outfit/a1b2c3d4}. */
    private String shareCode;
    private String shareUrl;
    private String title;
    private String caption;
    private String styleLabel;
    private String occasion;
    private String imageUrl;
    private String authorDisplayName;
    private String authorInitials;
    private List<String> brandNames;
    private List<ProductRef> products;
    private int likeCount;
    private int commentCount;
    private int viewCount;
    /** Whether the signed-in viewer liked this post (false for guests). */
    private boolean likedByMe;
    /** Whether the signed-in viewer saved this post (false for guests). */
    private boolean savedByMe;
    /** Whether the signed-in viewer published this post (false for guests). */
    private boolean mine;
    private Instant createdAt;

    @Data
    @Builder
    public static class ProductRef {
        private UUID productId;
        private String name;
        private String imageUrl;
        private BigDecimal price;
    }
}
