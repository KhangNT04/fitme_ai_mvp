package com.fitme.entitlement.dto;

import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.OutfitCoherenceMode;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConsumerEntitlementResponse {
    private ConsumerPlan plan;
    private OutfitCoherenceMode coherenceMode;
    private boolean plus;
    private String label;
    private String mixPolicy;
    private String upsellMessage;
}
