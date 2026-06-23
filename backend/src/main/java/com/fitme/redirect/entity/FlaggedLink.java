package com.fitme.redirect.entity;

import com.fitme.common.enums.FlaggedLinkReason;
import com.fitme.common.enums.FlaggedLinkStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "flagged_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlaggedLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "purchase_url", nullable = false, columnDefinition = "TEXT")
    private String purchaseUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FlaggedLinkReason reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private FlaggedLinkStatus status = FlaggedLinkStatus.OPEN;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;
}
