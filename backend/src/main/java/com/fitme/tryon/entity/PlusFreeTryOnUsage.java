package com.fitme.tryon.entity;

import com.fitme.common.enums.PlusFreeTryOnStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A free daily AI try-on spent on an all-Brand-Plus outfit instead of Fitken. */
@Entity
@Table(name = "plus_free_tryon_usage")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlusFreeTryOnUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "usage_date", nullable = false)
    private LocalDate usageDate;

    /** Preview generation id, the same reference Fitken try-on charges use. */
    @Column(name = "try_on_ref", nullable = false, unique = true)
    private UUID tryOnRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private PlusFreeTryOnStatus status = PlusFreeTryOnStatus.USED;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "refunded_at")
    private Instant refundedAt;
}
