package com.fitme.userprofile.entity;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.Gender;
import com.fitme.common.enums.SkinTone;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "body_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BodyProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "height_cm", nullable = false)
    private Integer heightCm;

    @Column(name = "weight_kg", nullable = false, precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Gender gender = Gender.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(name = "fit_preference", nullable = false)
    @Builder.Default
    private FitPreference fitPreference = FitPreference.REGULAR;

    @Enumerated(EnumType.STRING)
    @Column(name = "skin_tone", nullable = false)
    @Builder.Default
    private SkinTone skinTone = SkinTone.UNSURE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> goals;

    @Column(name = "shoulder_width_cm", precision = 6, scale = 2)
    private BigDecimal shoulderWidthCm;

    @Column(name = "chest_cm", precision = 6, scale = 2)
    private BigDecimal chestCm;

    @Column(name = "waist_cm", precision = 6, scale = 2)
    private BigDecimal waistCm;

    @Column(name = "abdomen_cm", precision = 6, scale = 2)
    private BigDecimal abdomenCm;

    @Column(name = "hip_cm", precision = 6, scale = 2)
    private BigDecimal hipCm;

    @Column(name = "thigh_cm", precision = 6, scale = 2)
    private BigDecimal thighCm;

    @Column(name = "inseam_cm", precision = 6, scale = 2)
    private BigDecimal inseamCm;

    @Column(name = "arm_length_cm", precision = 6, scale = 2)
    private BigDecimal armLengthCm;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
