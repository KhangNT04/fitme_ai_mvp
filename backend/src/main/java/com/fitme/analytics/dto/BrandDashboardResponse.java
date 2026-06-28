package com.fitme.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BrandDashboardResponse {
    private long totalProducts;
    private long activeProducts;
    private long aiRecommendedProducts;
    private long buyClicks;
    private double clickThroughRate;
    private long tryOnAttempts;
    private double tryOnToBuyRate;
}
