package com.fitme.review.dto;

import com.fitme.common.enums.ReviewStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ReviewItemDto {
    private UUID id;
    private UUID productId;
    private int rating;
    private String content;
    private List<String> imageUrls;
    private String authorName;
    private boolean verifiedPurchase;
    private ReviewStatus status;
    private int rewardGranted;
    private int helpfulCount;
    /** Whether the signed-in viewer voted this review helpful (false for guests). */
    private boolean helpfulByMe;
    /** Whether the signed-in viewer wrote this review. */
    private boolean mine;
    private Instant createdAt;
}
