package com.fitme.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "refresh_token_revocations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshTokenRevocation {

    @Id
    @Column(name = "token_hash", length = 64)
    private String tokenHash;

    @Column(name = "revoked_at", nullable = false)
    private Instant revokedAt;
}
