package com.fitme.review.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateReviewResponse {
    private ReviewItemDto review;
    /** Fitken granted for this review (0 when it did not qualify). */
    private int rewardGranted;
    /** True when the review qualified but today's rewarded-review limit was already used. */
    private boolean rewardLimitReached;
}
