package com.fitme.redirect.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PurchaseHistoryResponse {
    private long clickCount;
    private long purchasedCount;
    private BigDecimal estimatedSpend;
    private List<PurchaseHistoryItemResponse> items;
}
