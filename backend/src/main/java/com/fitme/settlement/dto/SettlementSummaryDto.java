package com.fitme.settlement.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class SettlementSummaryDto {
    /** Delivered, still inside the hold (return) period. */
    private long pendingVnd;
    /** Delivered, past the hold period, not yet in a settlement. */
    private long eligibleVnd;
    private long paidVnd;
    private Instant nextEligibleAt;
}
