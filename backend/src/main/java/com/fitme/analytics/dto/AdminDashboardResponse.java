package com.fitme.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminDashboardResponse {
    private long totalBrands;
    private long pendingBrands;
    private long totalProducts;
    private long pendingProducts;
    private long flaggedLinks;
    private long activeUsers;
    private long totalRecommendations;
    private long totalTryOns;
}
