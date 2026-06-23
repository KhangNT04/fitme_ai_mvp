package com.fitme.tryon.dto;

import com.fitme.common.enums.ItemRole;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class AddTryOnItemRequest {
    @NotNull
    private UUID productId;
    @NotNull
    private ItemRole role;
    private String selectedSize;
    private String selectedColor;
}
