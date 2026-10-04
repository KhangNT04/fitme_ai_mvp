package com.fitme.settlement.dto;

import com.fitme.common.enums.SettlementStatus;
import com.fitme.settlement.entity.SellerSettlement;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SettlementDto {
    private UUID id;
    private UUID brandId;
    private String brandName;
    private SettlementStatus status;
    private long subtotalVnd;
    private long commissionVnd;
    private long payoutVnd;
    private long orderCount;
    private String payoutRef;
    private Instant paidAt;
    private Instant createdAt;

    public static SettlementDto from(SellerSettlement settlement, String brandName, long orderCount) {
        return SettlementDto.builder()
                .id(settlement.getId())
                .brandId(settlement.getBrandId())
                .brandName(brandName)
                .status(settlement.getStatus())
                .subtotalVnd(settlement.getSubtotalVnd())
                .commissionVnd(settlement.getCommissionVnd())
                .payoutVnd(settlement.getPayoutVnd())
                .orderCount(orderCount)
                .payoutRef(settlement.getPayoutRef())
                .paidAt(settlement.getPaidAt())
                .createdAt(settlement.getCreatedAt())
                .build();
    }
}
