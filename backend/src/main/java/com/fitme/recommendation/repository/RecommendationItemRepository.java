package com.fitme.recommendation.repository;

import com.fitme.recommendation.entity.RecommendationItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RecommendationItemRepository extends JpaRepository<RecommendationItem, UUID> {

    List<RecommendationItem> findByRecommendationIdOrderBySortOrderAsc(UUID recommendationId);
}
