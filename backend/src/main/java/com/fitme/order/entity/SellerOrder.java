package com.fitme.order.entity;

import com.fitme.common.enums.SellerOrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * One brand's slice of a customer order; fulfilled and settled independently.
 * {@code @DynamicUpdate}: order flows and settlement generation write disjoint columns of the same row.
 */
@Entity
@DynamicUpdate
@Table(name = "seller_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private SellerOrderStatus status = SellerOrderStatus.PENDING;

    @Column(name = "subtotal_vnd", nullable = false)
    private long subtotalVnd;

    @Column(name = "shipping_fee_vnd", nullable = false)
    private long shippingFeeVnd;

    @Column(name = "commission_vnd", nullable = false)
    private long commissionVnd;

    @Column(name = "payout_vnd", nullable = false)
    private long payoutVnd;

    @Column(name = "settlement_id")
    private UUID settlementId;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
