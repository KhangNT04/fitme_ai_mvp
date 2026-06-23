package com.fitme.recommendation.entity;

import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.SourceType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "recommendation_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "recommendation_id", nullable = false)
    private UUID recommendationId;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "wardrobe_item_id")
    private UUID wardrobeItemId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false)
    private SourceType sourceType;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "selected_size")
    private String selectedSize;

    @Column(name = "selected_color")
    private String selectedColor;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}
