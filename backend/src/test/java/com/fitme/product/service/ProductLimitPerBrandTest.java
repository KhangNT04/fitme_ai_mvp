package com.fitme.product.service;

import com.fitme.product.entity.Product;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProductLimitPerBrandTest {

    @Test
    void keepsNewestProductsPerBrand() {
        UUID brandA = UUID.randomUUID();
        UUID brandB = UUID.randomUUID();
        UUID oldId = UUID.fromString("00000000-0000-0000-0000-000000000001");
        UUID midId = UUID.fromString("00000000-0000-0000-0000-000000000002");
        UUID newId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        UUID otherId = UUID.fromString("00000000-0000-0000-0000-000000000004");

        List<Product> input = List.of(
                product(oldId, brandA, "2026-01-01T00:00:00Z"),
                product(midId, brandA, "2026-06-01T00:00:00Z"),
                product(newId, brandA, "2026-11-01T00:00:00Z"),
                product(otherId, brandB, "2026-10-01T00:00:00Z")
        );

        List<Product> limited = ProductService.limitNewestPerBrand(input, 2);

        assertEquals(3, limited.size());
        assertEquals(List.of(newId, midId), limited.stream()
                .filter(p -> brandA.equals(p.getBrandId()))
                .map(Product::getId)
                .toList());
        assertEquals(List.of(otherId), limited.stream()
                .filter(p -> brandB.equals(p.getBrandId()))
                .map(Product::getId)
                .toList());
    }

    private static Product product(UUID id, UUID brandId, String createdAt) {
        return Product.builder()
                .id(id)
                .brandId(brandId)
                .name(id.toString())
                .createdAt(Instant.parse(createdAt))
                .build();
    }
}
