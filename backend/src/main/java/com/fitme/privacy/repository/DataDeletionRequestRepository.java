package com.fitme.privacy.repository;

import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.privacy.entity.DataDeletionRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DataDeletionRequestRepository extends JpaRepository<DataDeletionRequest, UUID> {

    List<DataDeletionRequest> findByUserId(UUID userId);

    List<DataDeletionRequest> findBySessionId(UUID sessionId);

    List<DataDeletionRequest> findByStatus(DeletionRequestStatus status);
}
