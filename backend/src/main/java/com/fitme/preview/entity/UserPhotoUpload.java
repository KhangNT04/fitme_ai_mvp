package com.fitme.preview.entity;

import com.fitme.common.enums.PhotoQualityStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_photo_uploads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPhotoUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "session_id")
    private UUID sessionId;

    @Column(name = "file_url", nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "file_type")
    private String fileType;

    @Column(name = "consent_id")
    private UUID consentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "quality_status", nullable = false)
    @Builder.Default
    private PhotoQualityStatus qualityStatus = PhotoQualityStatus.PENDING;

    @Column(nullable = false)
    @Builder.Default
    private String status = "UPLOADED";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
