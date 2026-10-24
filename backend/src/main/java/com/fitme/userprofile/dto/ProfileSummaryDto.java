package com.fitme.userprofile.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Aggregated numbers for the profile hub, so the page needs one request instead of five.
 * Every field is a plain count; no personal data beyond the signed-in user is exposed.
 */
@Data
@Builder
public class ProfileSummaryDto {
    /** 0..1 completion of the checklist shown in the profile progress card. */
    private double completionRatio;
    private boolean bodyProfileComplete;
    private boolean measurementsComplete;
    /** True when the user filled in a style profile (phong cách, dịp, màu sắc). */
    private boolean styleProfileComplete;
    /** True when the user picked at least one favourite brand (Premium feature). */
    private boolean brandPreferencesComplete;
    private boolean emailVerified;
    private boolean twoFactorEnabled;
    private int galleryImages;
    private int savedOutfits;
    private int savedTryOns;
    private int wardrobeItems;
    private int checkinStreak;
    private int fitkenBalance;
    private int fitkenEarnedThisMonth;
    private int communityPosts;
    private int communityFollowers;
    /** The next step worth completing, e.g. {@code BODY_PROFILE}; null when everything is done. */
    private String nextStep;
}
