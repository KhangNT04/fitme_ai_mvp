package com.fitme.session.service;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.recommendation.entity.OutfitRequest;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.recommendation.repository.OutfitRequestRepository;
import com.fitme.recommendation.repository.RecommendationRepository;
import com.fitme.session.dto.AnonymousSessionResponse;
import com.fitme.session.entity.AnonymousSession;
import com.fitme.session.repository.AnonymousSessionRepository;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnRequestRepository;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.repository.BodyProfileRepository;
import com.fitme.userprofile.repository.StyleProfileRepository;
import com.fitme.wardrobe.entity.WardrobeItem;
import com.fitme.wardrobe.repository.WardrobeItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final AnonymousSessionRepository sessionRepository;
    private final BodyProfileRepository bodyProfileRepository;
    private final StyleProfileRepository styleProfileRepository;
    private final WardrobeItemRepository wardrobeItemRepository;
    private final RecommendationRepository recommendationRepository;
    private final OutfitRequestRepository outfitRequestRepository;
    private final TryOnRequestRepository tryOnRequestRepository;
    private final FitMeProperties properties;

    @Transactional
    public AnonymousSessionResponse createAnonymousSession() {
        Instant now = Instant.now();
        String token = UUID.randomUUID().toString().replace("-", "");
        AnonymousSession session = AnonymousSession.builder()
                .sessionToken(token)
                .privacyVersion(properties.getPrivacy().getVersion())
                .lastSeenAt(now)
                .expiresAt(now.plus(30, ChronoUnit.DAYS))
                .build();
        session = sessionRepository.save(session);
        return toResponse(session);
    }

    public AnonymousSessionResponse getCurrentSession() {
        AnonymousSession session = RequestContext.getAnonymousSession()
                .orElseThrow(() -> new NotFoundException("Không tìm thấy session hiện tại"));
        return toResponse(session);
    }

    @Transactional
    public void linkToUser(String sessionToken) {
        UUID userId = RequestContext.requireUserId();
        AnonymousSession session = sessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new NotFoundException("Session không tồn tại"));
        if (session.getExpiresAt().isBefore(Instant.now())) {
            throw new BusinessException("Session đã hết hạn");
        }
        UUID sessionId = session.getId();
        migrateSessionDataToUser(sessionId, userId);
        session.setLinkedUserId(userId);
        session.setLastSeenAt(Instant.now());
        sessionRepository.save(session);
    }

    private void migrateSessionDataToUser(UUID sessionId, UUID userId) {
        bodyProfileRepository.findBySessionId(sessionId).forEach(p -> assignUserId(p, userId));
        styleProfileRepository.findBySessionId(sessionId).forEach(p -> assignUserId(p, userId));
        wardrobeItemRepository.findBySessionId(sessionId).forEach(item -> assignUserId(item, userId));
        recommendationRepository.findBySessionId(sessionId).forEach(rec -> assignUserId(rec, userId));
        outfitRequestRepository.findBySessionId(sessionId).forEach(req -> assignUserId(req, userId));
        tryOnRequestRepository.findBySessionId(sessionId).forEach(req -> assignUserId(req, userId));
    }

    private void assignUserId(BodyProfile profile, UUID userId) {
        profile.setUserId(userId);
        bodyProfileRepository.save(profile);
    }

    private void assignUserId(StyleProfile profile, UUID userId) {
        profile.setUserId(userId);
        styleProfileRepository.save(profile);
    }

    private void assignUserId(WardrobeItem item, UUID userId) {
        item.setUserId(userId);
        wardrobeItemRepository.save(item);
    }

    private void assignUserId(Recommendation rec, UUID userId) {
        rec.setUserId(userId);
        recommendationRepository.save(rec);
    }

    private void assignUserId(OutfitRequest req, UUID userId) {
        req.setUserId(userId);
        outfitRequestRepository.save(req);
    }

    private void assignUserId(TryOnRequest req, UUID userId) {
        req.setUserId(userId);
        tryOnRequestRepository.save(req);
    }

    private AnonymousSessionResponse toResponse(AnonymousSession session) {
        return AnonymousSessionResponse.builder()
                .sessionId(session.getId())
                .sessionToken(session.getSessionToken())
                .privacyVersion(session.getPrivacyVersion())
                .build();
    }
}
