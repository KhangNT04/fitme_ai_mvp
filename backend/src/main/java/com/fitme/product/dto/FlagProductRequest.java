package com.fitme.product.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FlagProductRequest {
    @Size(max = 100, message = "Lý do tối đa 100 ký tự")
    private String reason;
}
