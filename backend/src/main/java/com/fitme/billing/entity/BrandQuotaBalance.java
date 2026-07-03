package com.fitme.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "brand_quota_balances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandQuotaBalance {

    @Id
    @Column(name = "brand_id")
    private UUID brandId;

    @Column(name = "subscription_remaining", nullable = false)
    @Builder.Default
    private int subscriptionRemaining = 0;

    @Column(name = "topup_remaining", nullable = false)
    @Builder.Default
    private int topupRemaining = 0;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public int totalRemaining() {
        return subscriptionRemaining + topupRemaining;
    }
}
