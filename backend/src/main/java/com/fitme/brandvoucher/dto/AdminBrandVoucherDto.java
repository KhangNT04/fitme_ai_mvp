package com.fitme.brandvoucher.dto;

import com.fitme.common.enums.BrandVoucherStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class AdminBrandVoucherDto {
    private UUID id;
    private UUID campaignId;
    private UUID brandId;
    private String brandName;
    private String code;
    private int discountPercent;
    private BrandVoucherStatus status;
    private Instant issuedAt;
    private Instant expiresAt;
    private Long reservedOrderCode;
    private Long usedOrderCode;
    private Instant usedAt;
    private Instant revokedAt;
}
