package com.fitme.billing.entity;

import com.fitme.common.enums.BillingPlanType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Consumer plan (FitMe Premium or a Fitken top-up). {@code quotaAmount} is the Fitken granted per purchase/period. */
@Entity
@Table(name = "billing_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillingPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false, length = 32)
    private BillingPlanType planType;

    @Column(name = "price_vnd", nullable = false)
    private long priceVnd;

    @Column(name = "quota_amount", nullable = false)
    private int quotaAmount;

    @Column(name = "billing_period_days")
    private Integer billingPeriodDays;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
