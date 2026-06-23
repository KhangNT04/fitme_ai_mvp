package com.fitme.userprofile.entity;

import com.fitme.common.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "style_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StyleProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "primary_style", nullable = false)
    private String primaryStyle;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "secondary_styles", columnDefinition = "jsonb")
    private List<String> secondaryStyles;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    @Builder.Default
    private RiskLevel riskLevel = RiskLevel.BALANCED;

    @Column(name = "artistic_mode", nullable = false)
    @Builder.Default
    private boolean artisticMode = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preferred_colors", columnDefinition = "jsonb")
    private List<String> preferredColors;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "avoided_colors", columnDefinition = "jsonb")
    private List<String> avoidedColors;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
