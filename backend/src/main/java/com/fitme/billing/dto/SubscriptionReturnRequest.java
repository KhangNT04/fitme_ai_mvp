package com.fitme.billing.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubscriptionReturnRequest {
    @NotNull
    private Long orderCode;
}
