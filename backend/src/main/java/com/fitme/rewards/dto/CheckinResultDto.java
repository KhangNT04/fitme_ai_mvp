package com.fitme.rewards.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CheckinResultDto {
    private boolean checkedInToday;
    private int currentStreak;
    /** Fitken granted by this check-in (0 when the streak milestone was not reached or the wallet is at the cap). */
    private int rewardGranted;
    /** Reward this check-in earned before the free-Fitken cap was applied. */
    private int rewardIntended;
    /** True when the free-Fitken cap reduced the reward. */
    private boolean rewardCapped;
    /** Free-Fitken balance cap (admin setting fitken.max_balance). */
    private int maxBalance;
    private int balance;
}
