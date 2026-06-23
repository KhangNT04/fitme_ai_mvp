package com.fitme.product.entity;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.PurchaseChannel;
import com.fitme.common.enums.StockStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String category;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "VND";

    private String material;

    @Enumerated(EnumType.STRING)
    @Column(name = "fit_type")
    @Builder.Default
    private FitPreference fitType = FitPreference.REGULAR;

    @Column(name = "purchase_url", columnDefinition = "TEXT")
    private String purchaseUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "purchase_channel")
    private PurchaseChannel purchaseChannel;

    @Enumerated(EnumType.STRING)
    @Column(name = "stock_status", nullable = false)
    @Builder.Default
    private StockStatus stockStatus = StockStatus.IN_STOCK;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProductStatus status = ProductStatus.DRAFT;

    @Column(name = "is_sponsored", nullable = false)
    @Builder.Default
    private boolean isSponsored = false;

    @Column(name = "ai_try_on_eligible", nullable = false)
    @Builder.Default
    private boolean aiTryOnEligible = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
