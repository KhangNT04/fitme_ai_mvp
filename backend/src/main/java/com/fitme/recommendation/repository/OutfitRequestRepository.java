package com.fitme.recommendation.repository;

import com.fitme.recommendation.entity.OutfitRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OutfitRequestRepository extends JpaRepository<OutfitRequest, UUID> {

    List<OutfitRequest> findByUserId(UUID userId);

    List<OutfitRequest> findBySessionId(UUID sessionId);
}
