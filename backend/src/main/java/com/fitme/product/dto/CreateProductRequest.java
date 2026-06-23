package com.fitme.product.dto;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.PurchaseChannel;
import com.fitme.common.enums.StockStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateProductRequest {
    @NotBlank
    private String name;
    private String description;
    @NotBlank
    private String category;
    @NotNull
    private BigDecimal price;
    private String material;
    private FitPreference fitType;
    private String purchaseUrl;
    private PurchaseChannel purchaseChannel;
    private StockStatus stockStatus;
    private List<ProductImageDto> images;
    private List<ProductVariantDto> variants;
    private List<ProductTagDto> tags;
}
