package com.fitme.cart.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CartGroupDto {
    private UUID brandId;
    private String brandName;
    private long subtotalVnd;
    private List<CartItemDto> items;
}
