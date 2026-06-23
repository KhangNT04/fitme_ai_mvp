package com.fitme.product.dto;

import com.fitme.common.enums.StockStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductVariantDto {
    private String colorName;
    private String colorHex;
    private String sizeLabel;
    private String sku;
    private StockStatus stockStatus;
}
