package com.fitme.entitlement.dto;

import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.OutfitCoherenceMode;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SetConsumerPlanRequest {
    @NotNull
    private ConsumerPlan plan;

    /** Plus opt-in: PREFER (default) or STRICT. Cleared automatically when plan=FREE. */
    private OutfitCoherenceMode coherenceMode;
}
