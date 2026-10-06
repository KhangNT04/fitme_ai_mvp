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
    /** Free-Fitken cap: trial and reward Fitken stop once the balance reaches it; paid Fitken are not capped. */
    private int maxBalance;
    private ConsumerPlan plan;
    private SubscriptionInfoDto subscription;
}
