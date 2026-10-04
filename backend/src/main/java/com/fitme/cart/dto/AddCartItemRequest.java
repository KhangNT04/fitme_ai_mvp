package com.fitme.cart.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AddCartItemRequest {
    @NotNull(message = "Vui lòng chọn sản phẩm")
    private UUID productId;
    @NotNull(message = "Vui lòng chọn phân loại")
    private UUID variantId;
    private int quantity;
}
