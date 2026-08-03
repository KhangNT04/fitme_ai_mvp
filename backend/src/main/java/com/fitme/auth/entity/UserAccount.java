package com.fitme.auth.entity;

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    /** Consumer Free/Plus entitlement (billing stub until PayOS B2C). */
    @Enumerated(EnumType.STRING)
    @Column(name = "consumer_plan", nullable = false)
    @Builder.Default
    private ConsumerPlan consumerPlan = ConsumerPlan.FREE;

    /**
     * Optional Plus advanced coherence (PREFER/STRICT). Null = use FitMeProperties default for plan.
     * Ignored when plan is FREE.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "coherence_mode_override")
    private OutfitCoherenceMode coherenceModeOverride;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
