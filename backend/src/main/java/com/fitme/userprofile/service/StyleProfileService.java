package com.fitme.userprofile.service;

import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.userprofile.dto.StyleProfileRequest;
import com.fitme.userprofile.dto.StyleProfileResponse;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.repository.StyleProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StyleProfileService {

    private final StyleProfileRepository styleProfileRepository;

    @Transactional
    public StyleProfileResponse create(StyleProfileRequest request) {
        StyleProfile profile = findOrCreate();
        applyRequest(profile, request);
        return toResponse(styleProfileRepository.save(profile));
    }

    public StyleProfileResponse get() {
        return findProfile().map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Chưa có style profile"));
    }

    @Transactional
    public StyleProfileResponse update(StyleProfileRequest request) {
        StyleProfile profile = findProfile()
                .orElseThrow(() -> new NotFoundException("Chưa có style profile"));
        applyRequest(profile, request);
        return toResponse(styleProfileRepository.save(profile));
    }

    @Transactional
    public void delete() {
        StyleProfile profile = findProfile()
                .orElseThrow(() -> new NotFoundException("Chưa có style profile"));
        styleProfileRepository.delete(profile);
    }

    public Optional<StyleProfile> findProfileEntity() {
        return findProfile();
    }

    private Optional<StyleProfile> findProfile() {
        return RequestContext.getCurrentUserId()
                .flatMap(styleProfileRepository::findFirstByUserIdOrderByUpdatedAtDesc)
                .or(() -> RequestContext.getSessionId()
                        .flatMap(styleProfileRepository::findFirstBySessionIdOrderByUpdatedAtDesc));
    }

    private StyleProfile findOrCreate() {
        return findProfile().orElseGet(() -> {
            StyleProfile p = new StyleProfile();
            RequestContext.getCurrentUserId().ifPresent(p::setUserId);
            RequestContext.getSessionId().ifPresent(p::setSessionId);
            return p;
        });
    }

    private void applyRequest(StyleProfile profile, StyleProfileRequest request) {
        if (request.getPrimaryStyle() != null && !request.getPrimaryStyle().isBlank()) {
            profile.setPrimaryStyle(request.getPrimaryStyle());
        } else if (profile.getPrimaryStyle() == null) {
            profile.setPrimaryStyle("");
        }
        if (request.getSecondaryStyles() != null) {
            profile.setSecondaryStyles(request.getSecondaryStyles());
        }
        if (request.getRiskLevel() != null) {
            profile.setRiskLevel(request.getRiskLevel());
        }
        if (request.getArtisticMode() != null) {
            profile.setArtisticMode(Boolean.TRUE.equals(request.getArtisticMode()));
        }
        if (request.getPreferredColors() != null) {
            profile.setPreferredColors(request.getPreferredColors());
        }
        if (request.getAvoidedColors() != null) {
            profile.setAvoidedColors(request.getAvoidedColors());
        }
        if (profile.getUserId() == null) {
            RequestContext.getCurrentUserId().ifPresent(profile::setUserId);
        }
        if (profile.getSessionId() == null) {
            RequestContext.getSessionId().ifPresent(profile::setSessionId);
        }
    }

    private StyleProfileResponse toResponse(StyleProfile profile) {
        return StyleProfileResponse.builder()
                .id(profile.getId())
                .primaryStyle(profile.getPrimaryStyle())
                .secondaryStyles(profile.getSecondaryStyles())
                .riskLevel(profile.getRiskLevel())
                .artisticMode(profile.isArtisticMode())
                .preferredColors(profile.getPreferredColors())
                .avoidedColors(profile.getAvoidedColors())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
