package com.fitme.settlement.dto;

import com.fitme.brand.entity.Brand;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PayoutAccountDto {
    private String bankName;
    private String bankAccountNumber;
    private String bankAccountName;

    public static PayoutAccountDto from(Brand brand) {
        return PayoutAccountDto.builder()
                .bankName(brand.getBankName())
                .bankAccountNumber(brand.getBankAccountNumber())
                .bankAccountName(brand.getBankAccountName())
                .build();
    }
}
