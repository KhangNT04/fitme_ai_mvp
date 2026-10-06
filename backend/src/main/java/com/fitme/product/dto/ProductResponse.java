package com.fitme.product.dto;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.PurchaseChannel;
import com.fitme.common.enums.StockStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class ProductResponse {
    private UUID id;
    private UUID brandId;
    private String brandName;
    private String name;
    private String description;
    private String category;
    private BigDecimal price;
    private String currency;
    private String material;
    private FitPreference fitType;
    private String purchaseUrl;
    private PurchaseChannel purchaseChannel;
    private StockStatus stockStatus;
    private ProductStatus status;
    private boolean sponsored;
    private boolean aiTryOnEligible;
    private boolean canShowBuyButton;
    private List<ProductImageDto> images;
    private List<ProductVariantDto> variants;
    private List<ProductTagDto> tags;
    private List<SizeChartDto> sizeCharts;
    private Instant createdAt;
}
