package com.fitme.gallery.repository;

import com.fitme.gallery.entity.OutfitGalleryImage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OutfitGalleryImageRepository extends JpaRepository<OutfitGalleryImage, UUID> {

    @Modifying
    @Query(value = """
            INSERT INTO outfit_gallery_images
                (user_id, try_on_request_id, preview_generation_id, image_url, preview_source, product_ids, created_at)
            VALUES (:userId, :tryOnRequestId, :previewGenerationId, :imageUrl, :previewSource, :productIds, :createdAt)
            ON CONFLICT (preview_generation_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") UUID userId,
                       @Param("tryOnRequestId") UUID tryOnRequestId,
                       @Param("previewGenerationId") UUID previewGenerationId,
                       @Param("imageUrl") String imageUrl,
                       @Param("previewSource") String previewSource,
                       @Param("productIds") String productIds,
                       @Param("createdAt") Instant createdAt);

    Page<OutfitGalleryImage> findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<OutfitGalleryImage> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);

    List<OutfitGalleryImage> findByUserId(UUID userId);

    boolean existsByPreviewGenerationId(UUID previewGenerationId);

    long countByDeletedAtIsNull();

    long countByDeletedAtIsNullAndCreatedAtAfter(Instant after);

    @Query("select count(distinct g.userId) from OutfitGalleryImage g where g.deletedAt is null")
    long countDistinctUsers();
}
