package com.fitme.recommendation.repository;

import com.fitme.recommendation.entity.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RecommendationRepository extends JpaRepository<Recommendation, UUID> {

    List<Recommendation> findByOutfitRequestId(UUID outfitRequestId);

    List<Recommendation> findByUserId(UUID userId);

    List<Recommendation> findBySessionId(UUID sessionId);

    List<Recommendation> findByStatus(String status);

    List<Recommendation> findByUserIdAndSavedTrue(UUID userId);

    List<Recommendation> findBySessionIdAndSavedTrue(UUID sessionId);
}
