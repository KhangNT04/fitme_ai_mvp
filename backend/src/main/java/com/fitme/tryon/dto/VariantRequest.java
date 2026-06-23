package com.fitme.tryon.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class VariantRequest {
    private String value;
    private UUID productId;
}
