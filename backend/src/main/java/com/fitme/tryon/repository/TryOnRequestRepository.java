package com.fitme.tryon.repository;

import com.fitme.common.enums.TryOnStatus;
import com.fitme.tryon.entity.TryOnRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TryOnRequestRepository extends JpaRepository<TryOnRequest, UUID> {

    List<TryOnRequest> findByUserId(UUID userId);

    List<TryOnRequest> findBySessionId(UUID sessionId);

    List<TryOnRequest> findByStatus(TryOnStatus status);
}
