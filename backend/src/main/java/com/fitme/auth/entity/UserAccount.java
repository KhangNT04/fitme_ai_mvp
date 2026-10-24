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

    /**
     * Sign-in email the owner asked to switch to. It is only applied once the code sent to this
     * address is confirmed; until then the account keeps signing in with {@link #email}.
     */
    @Column(name = "pending_email")
    private String pendingEmail;

    /** 6-digit code sent to {@link #pendingEmail}; burned on use or when the change is cancelled. */
    @Column(name = "pending_email_code", length = 16)
    private String pendingEmailCode;

    @Column(name = "pending_email_code_expires_at")
    private Instant pendingEmailCodeExpiresAt;

    @Column(name = "pending_email_requested_at")
    private Instant pendingEmailRequestedAt;

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

    /** Base32 TOTP secret; set while enrolling, trusted only once {@link #totpEnabled} is true. */
    @Column(name = "totp_secret", length = 64)
    private String totpSecret;

    @Column(name = "totp_enabled", nullable = false)
    @Builder.Default
    private boolean totpEnabled = false;

    @Column(name = "totp_last_step")
    private Long totpLastStep;

    @Column(name = "totp_recovery_codes")
    private String totpRecoveryCodes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
