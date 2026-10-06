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
    private boolean premium;
    /** @deprecated alias of {@link #premium} for clients built against FitMe Pro; remove after one release. */
    @Deprecated
    private boolean pro;
    private String label;
    private String mixPolicy;
    private String upsellMessage;
    /** Current FitMe Premium price (admin editable); null when no plan is configured. */
    private Long premiumPriceVnd;
    /** Fitken granted per Premium period; null when no plan is configured. */
    private Integer premiumMonthlyFitken;
}
