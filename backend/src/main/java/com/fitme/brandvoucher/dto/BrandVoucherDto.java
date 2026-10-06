package com.fitme.brandvoucher.dto;

import com.fitme.common.enums.BrandVoucherStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class BrandVoucherDto {
    private UUID id;
    private String code;
    private String campaignName;
    private int discountPercent;
    private BrandVoucherStatus status;
    /** ISSUED and not past expiry: can be picked at checkout. */
    private boolean usable;
    private Instant issuedAt;
    private Instant expiresAt;
    private Instant usedAt;
    /** Order code of the pending checkout holding a RESERVED voucher. */
    private Long reservedOrderCode;
}
