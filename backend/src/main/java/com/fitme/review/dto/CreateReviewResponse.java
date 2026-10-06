package com.fitme.review.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CreateReviewResponse {
    private ReviewItemDto review;
    /** Fitken granted for this review (0 when it did not qualify or the wallet is at the cap). */
    private int rewardGranted;
    /** Reward the review earned before the free-Fitken cap was applied (0 when it did not qualify). */
    private int rewardIntended;
    /** True when the free-Fitken cap reduced the reward. */
    private boolean rewardCapped;
    /** Free-Fitken balance cap (admin setting fitken.max_balance). */
    private int maxBalance;
    /** True when the review qualified but today's rewarded-review limit was already used. */
    private boolean rewardLimitReached;
}
