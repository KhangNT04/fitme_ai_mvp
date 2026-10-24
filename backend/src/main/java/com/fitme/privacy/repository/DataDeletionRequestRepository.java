package com.fitme.privacy.repository;

import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.common.enums.DeletionRequestType;
import com.fitme.privacy.entity.DataDeletionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DataDeletionRequestRepository extends JpaRepository<DataDeletionRequest, UUID> {

    List<DataDeletionRequest> findByUserId(UUID userId);

    List<DataDeletionRequest> findBySessionId(UUID sessionId);

    List<DataDeletionRequest> findByStatus(DeletionRequestStatus status);

    /** The open self-service deletion request of a user, if any. */
    Optional<DataDeletionRequest> findFirstByUserIdAndRequestTypeAndStatus(
            UUID userId, DeletionRequestType requestType, DeletionRequestStatus status);

    /**
     * Requests whose grace period has run out and that still need to be executed. Compared in the
     * database so the deadline is judged by the database clock, not by a possibly different JVM offset.
     */
    @Query(value = """
            SELECT * FROM data_deletion_requests
            WHERE request_type = :requestType
              AND status = :status
              AND grace_period_ends_at IS NOT NULL
              AND grace_period_ends_at <= now()
            """, nativeQuery = true)
    List<DataDeletionRequest> findDueForExecution(
            @Param("requestType") String requestType, @Param("status") String status);
}
