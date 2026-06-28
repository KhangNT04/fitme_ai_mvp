package com.fitme.analytics.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChartDataPoint {
    private String name;
    private long value;
}
