package com.fitme.brandvoucher.dto;

import com.fitme.common.enums.BrandVoucherStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class VoucherCampaignDto {
    private UUID id;
    private String name;
    private String description;
    private int discountPercent;
    private int vouchersPerBrand;
    private int maxBrands;
    private Instant validFrom;
    private Instant validUntil;
    private boolean active;
    /** valid_until has passed: no more vouchers can be issued. */
    private boolean ended;
    private Instant createdAt;
    private Instant updatedAt;
    private long issuedBrandCount;
    private long voucherCount;
    /** Every status is present (0 when none). */
    private Map<BrandVoucherStatus, Long> voucherCountsByStatus;
}
