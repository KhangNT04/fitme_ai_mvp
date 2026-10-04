package com.fitme.order.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CancelOrderRequest {
    @Size(max = 1000, message = "Lý do hủy tối đa 1000 ký tự")
    private String reason;
}
