package com.fitme.voucher.dto;

import com.fitme.common.enums.VoucherStatus;
import com.fitme.common.enums.VoucherType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class UserVoucherDto {
    private UUID id;
    private VoucherType voucherType;
    private VoucherStatus status;
    private long maxDiscountVnd;
    private String sourceType;
    private UUID orderId;
    private Instant expiresAt;
    private Instant usedAt;
    private Instant createdAt;
}
