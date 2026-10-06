package com.fitme.privacy.service;

import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ConsentType;
import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.common.enums.UserRole;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
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
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrivacyService {

    private final ConsentRecordRepository consentRepository;
    private final DataDeletionRequestRepository deletionRepository;
    private final UserAccountRepository userAccountRepository;
    private final UserDataEraser userDataEraser;
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

    /** The most recent decision wins, so a withdrawal overrides any earlier acceptance. */
    public boolean hasConsent(ConsentType type) {
        return latestConsent(type).map(ConsentRecord::isAccepted).orElse(false);
    }

    public Map<ConsentType, Boolean> currentConsents() {
        Map<ConsentType, Boolean> result = new LinkedHashMap<>();
        Arrays.stream(ConsentType.values()).forEach(type -> result.put(type, hasConsent(type)));
        return result;
    }

    private Optional<ConsentRecord> latestConsent(ConsentType type) {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId != null) {
            return consentRepository.findFirstByUserIdAndConsentTypeOrderByCreatedAtDesc(userId, type);
        }
        if (sessionId != null) {
            return consentRepository.findFirstBySessionIdAndConsentTypeOrderByCreatedAtDesc(sessionId, type);
        }
        return Optional.empty();
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
        DataDeletionRequest req = deletionRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Yêu cầu xoá dữ liệu không tồn tại"));
        if (req.getStatus() == DeletionRequestStatus.COMPLETED) {
            return req;
        }
        UUID userId = req.getUserId();
        UUID sessionId = req.getSessionId();
        switch (req.getRequestType()) {
            case BODY_PROFILE -> userDataEraser.eraseBodyProfile(userId, sessionId);
            case STYLE_PROFILE -> userDataEraser.eraseStyleProfile(userId, sessionId);
            case WARDROBE -> userDataEraser.eraseWardrobe(userId, sessionId);
            case PHOTO_UPLOAD -> userDataEraser.erasePhotos(userId, sessionId);
            case RECOMMENDATION_HISTORY -> userDataEraser.eraseRecommendationHistory(userId, sessionId);
            case ALL -> {
                requireConsumerAccount(userId);
                userDataEraser.eraseAll(userId, sessionId);
            }
        }
        req.setStatus(DeletionRequestStatus.COMPLETED);
        req.setCompletedAt(Instant.now());
        return deletionRepository.save(req);
    }

    private void requireConsumerAccount(UUID userId) {
        if (userId == null) return;
        userAccountRepository.findById(userId).ifPresent(user -> {
            if (user.getRole() != UserRole.USER) {
                throw new BusinessException(
                        "Tài khoản brand/admin cần được xử lý thủ công trước khi xoá.", "DELETION_MANUAL_REVIEW");
            }
        });
    }
}
