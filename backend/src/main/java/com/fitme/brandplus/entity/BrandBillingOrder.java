package com.fitme.brandplus.entity;

import com.fitme.common.enums.BillingOrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/** A Brand Plus checkout. {@code amount} = {@code listPrice} minus {@code discountPercentApplied}, in VND. */
@Entity
@Table(name = "brand_billing_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BrandBillingOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "brand_id", nullable = false)
    private UUID brandId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    /** PayOS order code, from the sequence shared with consumer orders. */
    @Column(name = "order_code", nullable = false, unique = true)
    private long orderCode;

    @Column(name = "list_price", nullable = false)
    private long listPrice;

    @Column(name = "discount_percent_applied", nullable = false)
    private int discountPercentApplied;

    @Column(nullable = false)
    private long amount;

    @Column(name = "voucher_id")
    private UUID voucherId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private BillingOrderStatus status = BillingOrderStatus.PENDING;

    @Column(name = "payos_payment_link_id")
    private String payosPaymentLinkId;

    @Column(name = "checkout_url", columnDefinition = "TEXT")
    private String checkoutUrl;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
