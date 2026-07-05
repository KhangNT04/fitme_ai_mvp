package com.fitme.preview.entity;

import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "preview_generations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreviewGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "recommendation_id")
    private UUID recommendationId;

    @Column(name = "try_on_request_id")
    private UUID tryOnRequestId;

    @Column(name = "photo_upload_id")
    private UUID photoUploadId;

    @Enumerated(EnumType.STRING)
    @Column(name = "preview_type", nullable = false)
    @Builder.Default
    private PreviewType previewType = PreviewType.OUTFIT_BOARD;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private PreviewStatus status = PreviewStatus.PENDING;

    @Column(name = "preview_image_url", columnDefinition = "TEXT")
    private String previewImageUrl;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private String disclaimer = "Ảnh minh họa bằng AI, dùng để tham khảo. Form thực tế có thể khác tùy chất liệu, bảng size và cách mặc.";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "vton_job_id")
    private String vtonJobId;
}
