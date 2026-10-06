package com.fitme.brandplus.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class BrandPlusCheckoutRequest {
    /** Optional; one voucher per order. */
    private UUID voucherId;
}
