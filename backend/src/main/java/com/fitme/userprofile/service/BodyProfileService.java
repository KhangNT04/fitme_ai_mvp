package com.fitme.userprofile.service;

import com.fitme.common.enums.FitPreference;
import com.fitme.common.enums.SkinTone;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.userprofile.dto.BodyProfileRequest;
import com.fitme.userprofile.dto.BodyProfileResponse;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.repository.BodyProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BodyProfileService {

    private final BodyProfileRepository bodyProfileRepository;

    @Transactional
    public BodyProfileResponse create(BodyProfileRequest request) {
        BodyProfile profile = findOrCreate();
        applyRequest(profile, request);
        return toResponse(bodyProfileRepository.save(profile));
    }

    public BodyProfileResponse get() {
        return findProfile().map(this::toResponse)
                .orElseThrow(() -> new NotFoundException("Chưa có body profile"));
    }

    @Transactional
    public BodyProfileResponse update(BodyProfileRequest request) {
        BodyProfile profile = findProfile()
                .orElseThrow(() -> new NotFoundException("Chưa có body profile"));
        applyRequest(profile, request);
        return toResponse(bodyProfileRepository.save(profile));
    }

    @Transactional
    public void delete() {
        BodyProfile profile = findProfile()
                .orElseThrow(() -> new NotFoundException("Chưa có body profile"));
        bodyProfileRepository.delete(profile);
    }

    public java.util.Optional<BodyProfile> findProfileEntity() {
        return findProfile();
    }

    private java.util.Optional<BodyProfile> findProfile() {
        return RequestContext.getCurrentUserId()
                .flatMap(bodyProfileRepository::findFirstByUserIdOrderByUpdatedAtDesc)
                .or(() -> RequestContext.getSessionId()
                        .flatMap(bodyProfileRepository::findFirstBySessionIdOrderByUpdatedAtDesc));
    }

    private BodyProfile findOrCreate() {
        return findProfile().orElseGet(() -> {
            BodyProfile p = new BodyProfile();
            RequestContext.getCurrentUserId().ifPresent(p::setUserId);
            RequestContext.getSessionId().ifPresent(p::setSessionId);
            return p;
        });
    }

    private void applyRequest(BodyProfile profile, BodyProfileRequest request) {
        profile.setHeightCm(request.getHeightCm());
        profile.setWeightKg(request.getWeightKg());
        profile.setFitPreference(request.getFitPreference() != null ? request.getFitPreference() : FitPreference.REGULAR);
        profile.setSkinTone(request.getSkinTone() != null ? request.getSkinTone() : SkinTone.UNSURE);
        profile.setGoals(request.getGoals());
        profile.setShoulderWidthCm(request.getShoulderWidthCm());
        profile.setChestCm(request.getChestCm());
        profile.setWaistCm(request.getWaistCm());
        profile.setAbdomenCm(request.getAbdomenCm());
        profile.setHipCm(request.getHipCm());
        profile.setThighCm(request.getThighCm());
        profile.setInseamCm(request.getInseamCm());
        profile.setArmLengthCm(request.getArmLengthCm());
        if (profile.getUserId() == null) {
            RequestContext.getCurrentUserId().ifPresent(profile::setUserId);
        }
        if (profile.getSessionId() == null) {
            RequestContext.getSessionId().ifPresent(profile::setSessionId);
        }
    }

    private BodyProfileResponse toResponse(BodyProfile profile) {
        return BodyProfileResponse.builder()
                .id(profile.getId())
                .heightCm(profile.getHeightCm())
                .weightKg(profile.getWeightKg())
                .fitPreference(profile.getFitPreference())
                .skinTone(profile.getSkinTone())
                .goals(profile.getGoals())
                .shoulderWidthCm(profile.getShoulderWidthCm())
                .chestCm(profile.getChestCm())
                .waistCm(profile.getWaistCm())
                .abdomenCm(profile.getAbdomenCm())
                .hipCm(profile.getHipCm())
                .thighCm(profile.getThighCm())
                .inseamCm(profile.getInseamCm())
                .armLengthCm(profile.getArmLengthCm())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}
