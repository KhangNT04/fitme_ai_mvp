package com.fitme.brandvoucher.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** Admin-run batch of Brand Plus vouchers: each chosen brand gets {@code vouchersPerBrand} codes. */
@Entity
@Table(name = "voucher_campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "discount_percent", nullable = false)
    private int discountPercent;

    @Column(name = "vouchers_per_brand", nullable = false)
    private int vouchersPerBrand;

    @Column(name = "max_brands", nullable = false)
    private int maxBrands;

    /** Vouchers can be issued from this instant (null = any time). */
    @Column(name = "valid_from")
    private Instant validFrom;

    /** Issued vouchers expire at this instant (null = never). */
    @Column(name = "valid_until")
    private Instant validUntil;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isEndedAt(Instant now) {
        return validUntil != null && !validUntil.isAfter(now);
    }

    public boolean isNotStartedAt(Instant now) {
        return validFrom != null && now.isBefore(validFrom);
    }
}
