package com.fitme.review.dto;

import java.time.Instant;
import java.util.UUID;

public record FeaturedReviewDto(
        UUID id,
        UUID productId,
        String productName,
        int rating,
        String content,
        String authorName,
        String imageUrl,
        boolean verifiedPurchase,
        int helpfulCount,
        Instant createdAt
) {
}
