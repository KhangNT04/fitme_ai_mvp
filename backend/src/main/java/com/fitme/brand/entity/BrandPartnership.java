package com.fitme.brand.entity;

import com.fitme.common.enums.BrandPartnershipStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "brand_partnerships")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandPartnership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "brand_a_id", nullable = false)
    private UUID brandAId;

    @Column(name = "brand_b_id", nullable = false)
    private UUID brandBId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BrandPartnershipStatus status = BrandPartnershipStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
