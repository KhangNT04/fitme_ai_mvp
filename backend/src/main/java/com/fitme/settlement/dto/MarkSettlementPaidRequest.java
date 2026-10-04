package com.fitme.settlement.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MarkSettlementPaidRequest {
    @Size(max = 255, message = "Mã giao dịch quá dài")
    private String payoutRef;
}
