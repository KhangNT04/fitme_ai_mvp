package com.fitme.privacy.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ConsentType;
import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.common.security.RequestContext;
import com.fitme.privacy.dto.ConsentRequest;
import com.fitme.privacy.dto.DeletionRequestDto;
import com.fitme.privacy.entity.ConsentRecord;
import com.fitme.privacy.entity.DataDeletionRequest;
import com.fitme.privacy.repository.ConsentRecordRepository;
import com.fitme.privacy.repository.DataDeletionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrivacyService {

    private final ConsentRecordRepository consentRepository;
    private final DataDeletionRequestRepository deletionRepository;
    private final FitMeProperties properties;

    @Transactional
    public ConsentRecord recordConsent(ConsentType type) {
        return consentRepository.save(ConsentRecord.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .consentType(type)
                .consentVersion(properties.getPrivacy().getVersion())
                .accepted(true)
                .build());
    }

    @Transactional
    public ConsentRecord recordConsent(ConsentRequest request) {
        return consentRepository.save(ConsentRecord.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .consentType(request.getConsentType())
                .consentVersion(properties.getPrivacy().getVersion())
                .accepted(request.isAccepted())
                .build());
    }

    public boolean hasConsent(ConsentType type) {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId != null) {
            return consentRepository.existsByUserIdAndConsentTypeAndAcceptedTrue(userId, type);
        }
        if (sessionId != null) {
            return consentRepository.existsBySessionIdAndConsentTypeAndAcceptedTrue(sessionId, type);
        }
        return false;
    }

    @Transactional
    public DataDeletionRequest requestDeletion(DeletionRequestDto request) {
        return deletionRepository.save(DataDeletionRequest.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .requestType(request.getRequestType())
                .status(DeletionRequestStatus.PENDING)
                .build());
    }

    public List<ConsentRecord> listConsents() {
        return consentRepository.findAll();
    }

    public List<DataDeletionRequest> listDeletionRequests() {
        return deletionRepository.findAll();
    }

    @Transactional
    public DataDeletionRequest processDeletion(UUID id) {
        DataDeletionRequest req = deletionRepository.findById(id).orElseThrow();
        req.setStatus(DeletionRequestStatus.COMPLETED);
        req.setCompletedAt(Instant.now());
        return deletionRepository.save(req);
    }
}
