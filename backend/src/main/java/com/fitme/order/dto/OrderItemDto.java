package com.fitme.order.dto;

import com.fitme.order.entity.OrderItem;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class OrderItemDto {
    private UUID id;
    private UUID productId;
    private UUID variantId;
    private String name;
    private String variantLabel;
    private String imageUrl;
    private long unitPriceVnd;
    private int quantity;
    private long lineTotalVnd;

    public static OrderItemDto from(OrderItem item) {
        return OrderItemDto.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .variantId(item.getVariantId())
                .name(item.getProductName())
                .variantLabel(item.getVariantLabel())
                .imageUrl(item.getImageUrl())
                .unitPriceVnd(item.getUnitPriceVnd())
                .quantity(item.getQuantity())
                .lineTotalVnd(item.getLineTotalVnd())
                .build();
    }
}
