package com.fitme.privacy.entity;

import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.common.enums.DeletionRequestType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "data_deletion_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DataDeletionRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false)
    private DeletionRequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DeletionRequestStatus status = DeletionRequestStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    /** End of the grace period for {@link DeletionRequestType#ACCOUNT_DELETION}; null for other types. */
    @Column(name = "grace_period_ends_at")
    private Instant gracePeriodEndsAt;

    /** Why the user asked to delete their account, kept for product follow-up. */
    @Column(name = "reason")
    private String reason;

    /** Why the user cancelled, kept for support follow-up. */
    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;
}
