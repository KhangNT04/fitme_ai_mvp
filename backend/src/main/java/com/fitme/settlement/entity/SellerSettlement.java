package com.fitme.settlement.entity;

import com.fitme.common.enums.SettlementStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Payout batch for one brand: delivered seller orders past the hold period, paid out by bank transfer. */
@Entity
@Table(name = "seller_settlements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerSettlement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SettlementStatus status = SettlementStatus.PENDING;

    @Column(name = "subtotal_vnd", nullable = false)
    private long subtotalVnd;

    @Column(name = "commission_vnd", nullable = false)
    private long commissionVnd;

    @Column(name = "payout_vnd", nullable = false)
    private long payoutVnd;

    @Column(name = "payout_ref")
    private String payoutRef;

    @Column(name = "paid_at")
    private Instant paidAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
