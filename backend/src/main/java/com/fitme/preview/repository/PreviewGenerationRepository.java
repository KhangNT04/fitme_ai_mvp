package com.fitme.preview.repository;

import com.fitme.common.enums.PreviewStatus;
import com.fitme.preview.entity.PreviewGeneration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PreviewGenerationRepository extends JpaRepository<PreviewGeneration, UUID> {

    List<PreviewGeneration> findByRecommendationId(UUID recommendationId);

    List<PreviewGeneration> findByTryOnRequestId(UUID tryOnRequestId);

    List<PreviewGeneration> findByPhotoUploadId(UUID photoUploadId);

    List<PreviewGeneration> findByStatus(PreviewStatus status);
}
