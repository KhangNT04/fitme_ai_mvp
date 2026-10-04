package com.fitme.cart.service;

import com.fitme.brand.entity.Brand;
import com.fitme.cart.entity.CartItem;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductVariant;

import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** A cart row joined with its product, variant, brand and cover image. */
public record CartLine(CartItem item, Product product, ProductVariant variant, Brand brand, String imageUrl) {

    public int quantity() {
        return item.getQuantity();
    }

    public long unitPriceVnd() {
        return product.getPrice() == null ? 0 : product.getPrice().longValue();
    }

    public long lineTotalVnd() {
        return unitPriceVnd() * quantity();
    }

    /** Shown as "available" in the cart: still on sale and enough stock for the chosen quantity. */
    public boolean available() {
        return product.getStatus() == ProductStatus.ACTIVE && variant.getStockQuantity() >= quantity();
    }

    public boolean purchasable() {
        return available() && product.getPrice() != null;
    }

    public String variantLabel() {
        return Stream.of(variant.getColorName(), variant.getSizeLabel())
                .filter(Objects::nonNull)
                .collect(Collectors.joining(" / "));
    }
}
