package com.fitme.auth.entity;

import com.fitme.common.enums.BrandMixMode;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "display_name")
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.USER;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    @Column(name = "email_verification_code", length = 16)
    private String emailVerificationCode;

    @Column(name = "email_verification_expires_at")
    private Instant emailVerificationExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    /** Consumer Free/Premium entitlement, kept in sync with the active consumer subscription. */
    @Convert(converter = ConsumerPlanConverter.class)
    @Column(name = "consumer_plan", nullable = false)
    @Builder.Default
    private ConsumerPlan consumerPlan = ConsumerPlan.FREE;

    /**
     * Optional Premium advanced coherence (PREFER/STRICT). Null = use FitMeProperties default for plan.
     * Ignored when plan is FREE.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "coherence_mode_override")
    private OutfitCoherenceMode coherenceModeOverride;

    /** Premium brand preference mode; only applied to recommendations while the user is Premium. */
    @Enumerated(EnumType.STRING)
    @Column(name = "brand_mix_mode", nullable = false, length = 20)
    @Builder.Default
    private BrandMixMode brandMixMode = BrandMixMode.DIVERSE;

    @Column(name = "signup_source", length = 100)
    private String signupSource;

    @Column(name = "signup_medium", length = 100)
    private String signupMedium;

    @Column(name = "signup_campaign", length = 150)
    private String signupCampaign;

    @Column(name = "signup_referrer")
    private String signupReferrer;

    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
