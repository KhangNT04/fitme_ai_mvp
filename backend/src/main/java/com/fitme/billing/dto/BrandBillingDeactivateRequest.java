package com.fitme.billing.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class BrandBillingDeactivateRequest {
    @Size(max = 500)
    private String note;
}
