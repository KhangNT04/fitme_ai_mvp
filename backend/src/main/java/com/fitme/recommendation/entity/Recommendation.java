package com.fitme.recommendation.entity;

import com.fitme.common.enums.Confidence;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "outfit_request_id")
    private UUID outfitRequestId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    private String title;

    @Column(name = "style_label")
    private String styleLabel;

    @Column(name = "recommended_size")
    private String recommendedSize;

    @Column(name = "alternative_size")
    private String alternativeSize;

    @Column(name = "recommended_form")
    private String recommendedForm;

    @Column(name = "recommended_color")
    private String recommendedColor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Confidence confidence = Confidence.MEDIUM;

    @Column(name = "explanation_body", columnDefinition = "TEXT")
    private String explanationBody;

    @Column(name = "explanation_style", columnDefinition = "TEXT")
    private String explanationStyle;

    @Column(name = "explanation_occasion", columnDefinition = "TEXT")
    private String explanationOccasion;

    @Column(name = "explanation_color", columnDefinition = "TEXT")
    private String explanationColor;

    @Column(name = "explanation_wardrobe", columnDefinition = "TEXT")
    private String explanationWardrobe;

    @Column(nullable = false)
    @Builder.Default
    private String status = "GENERATED";

    @Column(nullable = false)
    @Builder.Default
    private boolean saved = false;

    @Column(name = "stylist_source")
    private String stylistSource;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
