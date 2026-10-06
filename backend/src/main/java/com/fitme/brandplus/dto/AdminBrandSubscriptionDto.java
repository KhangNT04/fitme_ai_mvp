package com.fitme.brandplus.dto;

import com.fitme.common.enums.BrandSubscriptionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class AdminBrandSubscriptionDto {
    private UUID brandId;
    private String brandName;
    private BrandSubscriptionStatus status;
    private boolean active;
    private Instant startsAt;
    private Instant endsAt;
}
