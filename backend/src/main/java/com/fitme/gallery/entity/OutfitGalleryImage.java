package com.fitme.gallery.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "outfit_gallery_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutfitGalleryImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "try_on_request_id")
    private UUID tryOnRequestId;

    @Column(name = "preview_generation_id", nullable = false, unique = true)
    private UUID previewGenerationId;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "preview_source", length = 32)
    private String previewSource;

    /** Comma-separated product ids snapshotted when the image was produced. */
    @Column(name = "product_ids", columnDefinition = "TEXT")
    private String productIds;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;
}
