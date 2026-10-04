package com.fitme.order.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/** Line snapshot (name, variant, image, price) taken when the order is placed. */
@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "seller_order_id", nullable = false)
    private UUID sellerOrderId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "variant_id", nullable = false)
    private UUID variantId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "variant_label")
    private String variantLabel;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "unit_price_vnd", nullable = false)
    private long unitPriceVnd;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "line_total_vnd", nullable = false)
    private long lineTotalVnd;
}
