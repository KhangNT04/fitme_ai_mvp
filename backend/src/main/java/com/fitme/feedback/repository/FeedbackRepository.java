package com.fitme.feedback.repository;

import com.fitme.feedback.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    List<Feedback> findByRecommendationId(UUID recommendationId);

    List<Feedback> findByTryOnRequestId(UUID tryOnRequestId);

    List<Feedback> findByUserId(UUID userId);
}
