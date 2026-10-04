package com.fitme.rewards.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class RewardsSummaryDto {
    private int balance;
    private CheckinStatus checkin;
    private ShareStatus share;
    private ReviewRewardStatus review;

    @Data
    @Builder
    public static class CheckinStatus {
        private boolean checkedInToday;
        private int currentStreak;
        private int streakTarget;
        private int daysUntilNextReward;
        private int rewardAmount;
        private List<LocalDate> recentDays;
    }

    @Data
    @Builder
    public static class ShareStatus {
        private int rewardAmount;
        private int dailyLimit;
        private int remainingToday;
        private List<String> allowedDomains;
        private List<ShareClaimDto> recentClaims;
    }

    @Data
    @Builder
    public static class ReviewRewardStatus {
        private int rewardAmount;
        private int minContentLength;
        private long rewardedCount;
    }
}
