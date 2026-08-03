package com.fitme.analytics.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BrandDemandInsightResponse {
    private long outfitLikes;
    private long outfitDislikes;
    private long buyClicks;
    private long purchasedConfirmed;
    private List<InsightItem> topClickedProducts;
    private List<InsightItem> topLikedSignals;
    private String summaryVi;

    @Data
    @Builder
    public static class InsightItem {
        private String label;
        private long count;
    }
}
