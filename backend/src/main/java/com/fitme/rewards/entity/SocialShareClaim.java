package com.fitme.rewards.entity;

import com.fitme.common.enums.ShareClaimStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "social_share_claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialShareClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "post_url", nullable = false, unique = true, columnDefinition = "TEXT")
    private String postUrl;

    @Column(nullable = false, length = 32)
    private String platform;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private ShareClaimStatus status = ShareClaimStatus.APPROVED;

    @Column(name = "reward_granted", nullable = false)
    private int rewardGranted;

    @Column(name = "try_on_request_id")
    private UUID tryOnRequestId;

    @Column(name = "gallery_image_id")
    private UUID galleryImageId;

    @Column(name = "claim_date", nullable = false)
    private LocalDate claimDate;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
