package com.fitme.redirect.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class BuyClickRequest {
    @NotNull
    private UUID productId;
    private UUID recommendationId;
    private UUID tryOnRequestId;
    private String selectedSize;
    private String selectedColor;
    @NotBlank
    private String sourcePage;
}
