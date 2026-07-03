package com.fitme.billing.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuotaAdjustRequest {
    private int subscriptionDelta;
    private int topupDelta;
    private String note;
}
