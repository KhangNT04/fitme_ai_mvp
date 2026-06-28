package com.fitme.analytics.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BrandAnalyticsResponse {
    private List<ChartDataPoint> redirectClicks;
    private List<ChartDataPoint> dropoffPoints;
    private List<ChartDataPoint> hesitationItems;
    private List<ChartDataPoint> tryOnStats;
    private List<ChartDataPoint> topOccasions;
    private List<ChartDataPoint> topStyles;
    private List<ChartDataPoint> topColors;
    private List<ChartDataPoint> topSizes;
}
