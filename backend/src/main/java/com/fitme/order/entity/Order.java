package com.fitme.order.entity;

import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.PaymentMethod;
import com.fitme.common.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Customer order; split into one {@link SellerOrder} per brand. The shipping address is a snapshot.
 * Entity name avoids the JPQL keyword {@code ORDER}.
 */
@Entity(name = "CustomerOrder")
@DynamicUpdate
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "order_code", nullable = false, unique = true, length = 30)
    private String orderCode;

    @Column(name = "payos_order_code", unique = true)
    private Long payosOrderCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus;

    @Column(name = "subtotal_vnd", nullable = false)
    private long subtotalVnd;

    @Column(name = "shipping_fee_vnd", nullable = false)
    private long shippingFeeVnd;

    @Column(name = "discount_vnd", nullable = false)
    private long discountVnd;

    @Column(name = "total_vnd", nullable = false)
    private long totalVnd;

    @Column(name = "refund_due_vnd", nullable = false)
    private long refundDueVnd;

    @Column(name = "voucher_id")
    private UUID voucherId;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(nullable = false, length = 100)
    private String province;

    @Column(nullable = false, length = 100)
    private String district;

    @Column(nullable = false, length = 100)
    private String ward;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String street;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
