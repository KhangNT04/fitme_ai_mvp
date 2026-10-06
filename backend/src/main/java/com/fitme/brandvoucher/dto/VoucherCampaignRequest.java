package com.fitme.brandvoucher.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

@Data
public class VoucherCampaignRequest {
    @NotBlank(message = "Nhập tên chiến dịch")
    @Size(max = 255, message = "Tên chiến dịch tối đa 255 ký tự")
    private String name;
    @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
    private String description;
    /** Capped at 99: a 100% voucher would make a 0đ order, which PayOS cannot collect. */
    @NotNull(message = "Phần trăm giảm phải từ 1 đến 99")
    @Min(value = 1, message = "Phần trăm giảm phải từ 1 đến 99")
    @Max(value = 99, message = "Phần trăm giảm phải từ 1 đến 99")
    private Integer discountPercent;
    @NotNull(message = "Số voucher mỗi brand phải từ 1 đến 100")
    @Min(value = 1, message = "Số voucher mỗi brand phải từ 1 đến 100")
    @Max(value = 100, message = "Số voucher mỗi brand phải từ 1 đến 100")
    private Integer vouchersPerBrand;
    @NotNull(message = "Số brand tối đa phải từ 1 trở lên")
    @Min(value = 1, message = "Số brand tối đa phải từ 1 trở lên")
    private Integer maxBrands;
    private Instant validFrom;
    private Instant validUntil;
    private boolean active = true;
}
