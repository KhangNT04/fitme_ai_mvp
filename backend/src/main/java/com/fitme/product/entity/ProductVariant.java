package com.fitme.product.entity;

import com.fitme.common.enums.StockStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_variants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "color_name")
    private String colorName;

    @Column(name = "color_hex")
    private String colorHex;

    @Column(name = "size_label")
    private String sizeLabel;

    private String sku;

    @Enumerated(EnumType.STRING)
    @Column(name = "stock_status", nullable = false)
    @Builder.Default
    private StockStatus stockStatus = StockStatus.IN_STOCK;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
