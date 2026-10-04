package com.fitme.settlement.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommerceSummaryDto {
    /** Total of COMPLETED customer orders. */
    private long gmvVnd;
    private long ordersCount;
    /** Commission on DELIVERED seller orders. */
    private long commissionVnd;
    private long pendingSettlementVnd;
}
