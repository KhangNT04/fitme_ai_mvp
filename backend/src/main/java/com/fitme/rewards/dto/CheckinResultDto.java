package com.fitme.rewards.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CheckinResultDto {
    private boolean checkedInToday;
    private int currentStreak;
    /** Fitken granted by this check-in (0 when the streak milestone was not reached). */
    private int rewardGranted;
    private int balance;
}
