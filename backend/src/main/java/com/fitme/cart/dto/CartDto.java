package com.fitme.cart.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CartDto {
    private int itemCount;
    private long subtotalVnd;
    private List<CartGroupDto> groups;
}
