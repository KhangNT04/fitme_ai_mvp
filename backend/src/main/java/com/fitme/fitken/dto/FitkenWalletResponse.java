package com.fitme.fitken.dto;

import com.fitme.billing.dto.SubscriptionInfoDto;
import com.fitme.common.enums.ConsumerPlan;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FitkenWalletResponse {
    private int balance;
    private int subscriptionRemaining;
    private int bonusRemaining;
    private boolean trialGranted;
    private int tryOnCost;
    private ConsumerPlan plan;
    private SubscriptionInfoDto subscription;
}
