package com.fitme.product.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "size_charts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SizeChart {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "size_label", nullable = false)
    private String sizeLabel;

    @Column(name = "chest_cm", precision = 6, scale = 2)
    private BigDecimal chestCm;

    @Column(name = "waist_cm", precision = 6, scale = 2)
    private BigDecimal waistCm;

    @Column(name = "hip_cm", precision = 6, scale = 2)
    private BigDecimal hipCm;

    @Column(name = "shoulder_cm", precision = 6, scale = 2)
    private BigDecimal shoulderCm;

    @Column(name = "length_cm", precision = 6, scale = 2)
    private BigDecimal lengthCm;

    @Column(name = "inseam_cm", precision = 6, scale = 2)
    private BigDecimal inseamCm;

    @Column(name = "weight_min_kg", precision = 5, scale = 2)
    private BigDecimal weightMinKg;

    @Column(name = "weight_max_kg", precision = 5, scale = 2)
    private BigDecimal weightMaxKg;

    @Column(name = "height_min_cm")
    private Integer heightMinCm;

    @Column(name = "height_max_cm")
    private Integer heightMaxCm;

    @Column(columnDefinition = "TEXT")
    private String note;
}
