package com.fitme.brandplus.entity;

import com.fitme.common.enums.BrandSubscriptionStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** A brand's Brand Plus period (one row per brand; each paid order extends {@code endsAt}). */
@Entity
@Table(name = "brand_subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "brand_id", nullable = false, unique = true)
    private UUID brandId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private BrandSubscriptionStatus status = BrandSubscriptionStatus.ACTIVE;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(name = "last_order_id")
    private UUID lastOrderId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isActiveAt(Instant now) {
        return status == BrandSubscriptionStatus.ACTIVE && endsAt != null && endsAt.isAfter(now);
    }
}
