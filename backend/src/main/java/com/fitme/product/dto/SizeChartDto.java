package com.fitme.product.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class SizeChartDto {
    private String sizeLabel;
    private BigDecimal chestCm;
    private BigDecimal waistCm;
    private BigDecimal hipCm;
    private BigDecimal shoulderCm;
    private BigDecimal lengthCm;
    private BigDecimal inseamCm;
    private BigDecimal weightMinKg;
    private BigDecimal weightMaxKg;
    private Integer heightMinCm;
    private Integer heightMaxCm;
    private String note;
}
