package com.fitme.fitken.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fitken_wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FitkenWallet {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "subscription_remaining", nullable = false)
    private int subscriptionRemaining;

    @Column(name = "bonus_remaining", nullable = false)
    private int bonusRemaining;

    @Column(name = "trial_granted_at")
    private Instant trialGrantedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public int balance() {
        return subscriptionRemaining + bonusRemaining;
    }
}
