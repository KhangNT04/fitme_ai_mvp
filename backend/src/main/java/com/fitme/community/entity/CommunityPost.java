package com.fitme.community.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityPost {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "gallery_image_id")
    private UUID galleryImageId;

    @Column(name = "try_on_request_id")
    private UUID tryOnRequestId;

    @Column(name = "recommendation_id")
    private UUID recommendationId;

    /** Short public code used in the share URL, e.g. {@code /outfit/a1b2c3d4}. */
    @Column(name = "share_code", nullable = false, unique = true, length = 24)
    private String shareCode;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String caption;

    @Column(name = "style_label", length = 60)
    private String styleLabel;

    @Column(length = 60)
    private String occasion;

    /** Comma-separated brand ids snapshotted when the post was published. */
    @Column(name = "brand_ids", columnDefinition = "TEXT")
    private String brandIds;

    /** Comma-separated product ids snapshotted when the post was published. */
    @Column(name = "product_ids", columnDefinition = "TEXT")
    private String productIds;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(nullable = false, length = 16)
    @Builder.Default
    private String visibility = "PUBLIC";

    /** Maintained by SQL when votes change, so entity saves never overwrite concurrent counts. */
    @Column(name = "like_count", insertable = false, updatable = false)
    private int likeCount;

    @Column(name = "comment_count", insertable = false, updatable = false)
    private int commentCount;

    @Column(name = "view_count", insertable = false, updatable = false)
    private int viewCount;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, updatable = false)
    private Instant updatedAt;
}
