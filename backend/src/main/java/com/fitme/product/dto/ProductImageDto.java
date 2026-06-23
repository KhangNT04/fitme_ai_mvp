package com.fitme.product.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductImageDto {
    private String imageUrl;
    private String imageType;
    private Integer sortOrder;
}
