package com.fitme.brandlead.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MarkLeadSoldRequest {
    @NotNull(message = "Thiếu trạng thái đã bán")
    private Boolean sold;
}
