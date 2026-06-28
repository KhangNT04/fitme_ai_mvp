package com.fitme.analytics.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProductAnalyticsResponse {
    private long views;
    private long buyClicks;
    private long tryOns;
    private List<ChartDataPoint> redirectClicks;
}
