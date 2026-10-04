package com.fitme.review.dto;

import lombok.Data;

@Data
public class HideReviewRequest {
    private String note;
    /** Also take back the review reward (default false — hidden reviews keep their reward). */
    private boolean revokeReward;
}
