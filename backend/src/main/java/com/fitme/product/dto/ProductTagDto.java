package com.fitme.product.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProductTagDto {
    private String tagType;
    private String tagValue;
}
