package com.fitme.settlement.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SalesSummaryDto {
    private long ordersLast30Days;
    private long revenueLast30DaysVnd;
    private long deliveredCount;
    private long cancelledCount;
}
