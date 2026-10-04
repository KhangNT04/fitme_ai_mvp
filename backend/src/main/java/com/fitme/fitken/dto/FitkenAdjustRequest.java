package com.fitme.fitken.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class FitkenAdjustRequest {
    @Min(-10000)
    @Max(10000)
    private int delta;
    private String note;
}
