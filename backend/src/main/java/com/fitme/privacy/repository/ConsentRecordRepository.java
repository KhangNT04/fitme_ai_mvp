package com.fitme.privacy.repository;

import com.fitme.common.enums.ConsentType;
import com.fitme.privacy.entity.ConsentRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConsentRecordRepository extends JpaRepository<ConsentRecord, UUID> {

    List<ConsentRecord> findByUserId(UUID userId);

    List<ConsentRecord> findBySessionId(UUID sessionId);

    List<ConsentRecord> findByUserIdAndConsentType(UUID userId, ConsentType consentType);

    List<ConsentRecord> findBySessionIdAndConsentType(UUID sessionId, ConsentType consentType);

    Optional<ConsentRecord> findFirstByUserIdAndConsentTypeOrderByCreatedAtDesc(UUID userId, ConsentType consentType);

    Optional<ConsentRecord> findFirstBySessionIdAndConsentTypeOrderByCreatedAtDesc(UUID sessionId, ConsentType consentType);
}
