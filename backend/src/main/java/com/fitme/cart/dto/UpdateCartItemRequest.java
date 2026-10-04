package com.fitme.cart.dto;

import lombok.Data;

@Data
public class UpdateCartItemRequest {
    /** 0 or less removes the line. */
    private int quantity;
}
