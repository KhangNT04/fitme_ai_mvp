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
        if (request.getAge() != null) {
            profile.setAge(request.getAge());
        }
        profile.setGender(request.getGender());
        if (request.getFitPreference() != null) {
            profile.setFitPreference(request.getFitPreference());
        } else if (profile.getFitPreference() == null) {
            profile.setFitPreference(FitPreference.REGULAR);
        }
        if (request.getSkinTone() != null) {
            profile.setSkinTone(request.getSkinTone());
        } else if (profile.getSkinTone() == null) {
            profile.setSkinTone(SkinTone.UNSURE);
        }
        if (request.getGoals() != null) {
            profile.setGoals(request.getGoals());
        }
        if (request.getShoulderWidthCm() != null) {
            profile.setShoulderWidthCm(request.getShoulderWidthCm());
        }
        if (request.getChestCm() != null) {
            profile.setChestCm(request.getChestCm());
        }
        if (request.getWaistCm() != null) {
            profile.setWaistCm(request.getWaistCm());
        }
        if (request.getAbdomenCm() != null) {
            profile.setAbdomenCm(request.getAbdomenCm());
        }
        if (request.getHipCm() != null) {
            profile.setHipCm(request.getHipCm());
        }
        if (request.getThighCm() != null) {
            profile.setThighCm(request.getThighCm());
        }
        if (request.getInseamCm() != null) {
            profile.setInseamCm(request.getInseamCm());
        }
        if (request.getArmLengthCm() != null) {
            profile.setArmLengthCm(request.getArmLengthCm());
        }
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
                .age(profile.getAge())
                .gender(profile.getGender())
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
