package com.fitme.cart.dto;

import com.fitme.cart.service.CartLine;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class CartItemDto {
    private UUID id;
    private UUID productId;
    private UUID variantId;
    private String name;
    private String imageUrl;
    private String colorName;
    private String sizeLabel;
    private long unitPriceVnd;
    private int quantity;
    private long lineTotalVnd;
    private int stockQuantity;
    private boolean available;

    public static CartItemDto from(CartLine line) {
        return CartItemDto.builder()
                .id(line.item().getId())
                .productId(line.product().getId())
                .variantId(line.variant().getId())
                .name(line.product().getName())
                .imageUrl(line.imageUrl())
                .colorName(line.variant().getColorName())
                .sizeLabel(line.variant().getSizeLabel())
                .unitPriceVnd(line.unitPriceVnd())
                .quantity(line.quantity())
                .lineTotalVnd(line.lineTotalVnd())
                .stockQuantity(line.variant().getStockQuantity())
                .available(line.available())
                .build();
    }
}
