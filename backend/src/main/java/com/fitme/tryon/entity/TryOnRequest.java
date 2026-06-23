package com.fitme.tryon.entity;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.SkinTone;
import com.fitme.common.enums.TryOnStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "try_on_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TryOnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "photo_upload_id")
    private UUID photoUploadId;

    private String occasion;

    @Column(name = "desired_vibe", columnDefinition = "TEXT")
    private String desiredVibe;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_fit")
    private FitPreference preferredFit;

    @Column(name = "comfort_preference")
    private String comfortPreference;

    @Column(name = "normally_worn_top_size")
    private String normallyWornTopSize;

    @Column(name = "normally_worn_bottom_size")
    private String normallyWornBottomSize;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(name = "weight_kg", precision = 5, scale = 2)
    private BigDecimal weightKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "skin_tone")
    private SkinTone skinTone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TryOnStatus status = TryOnStatus.DRAFT;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
