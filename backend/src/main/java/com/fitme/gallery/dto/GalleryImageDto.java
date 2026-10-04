package com.fitme.gallery.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class GalleryImageDto {
    private UUID id;
    private String imageUrl;
    private UUID tryOnRequestId;
    private String previewSource;
    private List<ProductRef> products;
    private Instant createdAt;

    @Data
    @Builder
    public static class ProductRef {
        private UUID productId;
        private String name;
        private String imageUrl;
        private BigDecimal price;
    }
}
