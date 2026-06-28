package com.fitme.brand.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BrandApplicationResponse {
    private BrandResponse brand;
    private boolean hasApplication;
    private String message;
}
