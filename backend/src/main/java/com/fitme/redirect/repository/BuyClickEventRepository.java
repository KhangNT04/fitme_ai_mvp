package com.fitme.redirect.repository;

import com.fitme.redirect.entity.BuyClickEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BuyClickEventRepository extends JpaRepository<BuyClickEvent, UUID> {

    List<BuyClickEvent> findByProductId(UUID productId);

    List<BuyClickEvent> findByUserId(UUID userId);

    List<BuyClickEvent> findBySessionId(UUID sessionId);

    List<BuyClickEvent> findByRecommendationId(UUID recommendationId);
}
