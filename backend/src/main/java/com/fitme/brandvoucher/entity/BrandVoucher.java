package com.fitme.brandvoucher.entity;

import com.fitme.common.enums.BrandVoucherStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** A single-use Brand Plus discount code owned by one brand. */
@Entity
@Table(name = "brand_vouchers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "campaign_id", nullable = false)
    private UUID campaignId;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Column(nullable = false, unique = true, length = 32)
    private String code;

    @Column(name = "discount_percent", nullable = false)
    private int discountPercent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private BrandVoucherStatus status = BrandVoucherStatus.ISSUED;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "reserved_order_id")
    private UUID reservedOrderId;

    @Column(name = "used_order_id")
    private UUID usedOrderId;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "revoked_by")
    private UUID revokedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isPastExpiry(Instant now) {
        return expiresAt != null && expiresAt.isBefore(now);
    }

    /** Status as shown to users: an ISSUED voucher past its expiry is EXPIRED even before the job marks it. */
    public BrandVoucherStatus effectiveStatus(Instant now) {
        return status == BrandVoucherStatus.ISSUED && isPastExpiry(now) ? BrandVoucherStatus.EXPIRED : status;
    }
}
