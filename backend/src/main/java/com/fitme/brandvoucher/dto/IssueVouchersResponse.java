package com.fitme.brandvoucher.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class IssueVouchersResponse {
    private List<BrandRef> issued;
    /** Brands that already had vouchers from this campaign; nothing new was issued to them. */
    private List<BrandRef> skipped;
    private int vouchersIssued;
    private VoucherCampaignDto campaign;

    public record BrandRef(UUID brandId, String brandName) {
    }
}
