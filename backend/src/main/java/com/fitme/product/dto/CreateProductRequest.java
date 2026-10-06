package com.fitme.product.dto;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.PurchaseChannel;
import com.fitme.common.enums.StockStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateProductRequest {
    @NotBlank(message = "Tên sản phẩm không được để trống")
    @Size(max = 255, message = "Tên sản phẩm tối đa 255 ký tự")
    private String name;
    private String description;
    @NotBlank(message = "Danh mục không được để trống")
    @Size(max = 100, message = "Danh mục tối đa 100 ký tự")
    private String category;
    @NotNull(message = "Giá sản phẩm không được để trống")
    @DecimalMin(value = "1000", message = "Giá sản phẩm tối thiểu 1.000đ")
    @DecimalMax(value = "1000000000", message = "Giá sản phẩm tối đa 1.000.000.000đ")
    private BigDecimal price;
    private String material;
    private FitPreference fitType;
    @NotBlank(message = "Link mua hàng không được để trống")
    @Size(max = 2048, message = "Link mua hàng tối đa 2048 ký tự")
    private String purchaseUrl;
    private PurchaseChannel purchaseChannel;
    private StockStatus stockStatus;
    private List<ProductImageDto> images;
    private List<ProductVariantDto> variants;
    private List<ProductTagDto> tags;
    private List<SizeChartDto> sizeCharts;
}
