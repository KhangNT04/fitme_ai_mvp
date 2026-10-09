package com.fitme.preview.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.OwnershipChecker;
import com.fitme.common.security.RequestContext;
import com.fitme.preview.dto.CreatePreviewRequest;
import com.fitme.preview.dto.PreviewResponse;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.entity.UserPhotoUpload;
import com.fitme.preview.repository.PreviewGenerationRepository;
import com.fitme.preview.repository.UserPhotoUploadRepository;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.recommendation.repository.RecommendationRepository;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PreviewService {

    private final PreviewGenerationRepository previewRepository;
    private final PreviewGenerator previewGenerator;
    private final AnalyticsService analyticsService;
    private final RecommendationRepository recommendationRepository;
    private final TryOnRequestRepository tryOnRequestRepository;
    private final UserPhotoUploadRepository photoUploadRepository;

    @Transactional
    public PreviewResponse create(CreatePreviewRequest request) {
        if (request.getRecommendationId() == null && request.getTryOnRequestId() == null
                && request.getPhotoUploadId() == null) {
            throw new BusinessException("Cần chọn outfit, lượt thử đồ hoặc ảnh để tạo preview");
        }
        if (request.getRecommendationId() != null) {
            verifyRecommendationOwnership(request.getRecommendationId());
        }
        if (request.getTryOnRequestId() != null) {
            verifyTryOnOwnership(request.getTryOnRequestId());
        }
        if (request.getPhotoUploadId() != null) {
            UserPhotoUpload upload = photoUploadRepository.findById(request.getPhotoUploadId())
                    .filter(u -> u.getDeletedAt() == null)
                    .orElseThrow(() -> new NotFoundException("Ảnh không tồn tại"));
            OwnershipChecker.verify(upload.getUserId(), upload.getSessionId());
        }
        PreviewType type = request.getPreviewType() != null ? request.getPreviewType() : PreviewType.OUTFIT_BOARD;
        PreviewGeneration preview = PreviewGeneration.builder()
                .recommendationId(request.getRecommendationId())
                .tryOnRequestId(request.getTryOnRequestId())
                .photoUploadId(request.getPhotoUploadId())
                .previewType(type)
                .status(PreviewStatus.PROCESSING)
                .build();
        preview = previewRepository.save(preview);

        try {
            PreviewGenerator.PreviewResult result = previewGenerator.generate(
                    new PreviewGenerator.PreviewRequest(request.getRecommendationId(),
                            request.getTryOnRequestId(), request.getPhotoUploadId(), type, null));
            preview.setPreviewImageUrl(result.imageUrl());
            preview.setDisclaimer(result.disclaimer());
            preview.setStatus(PreviewStatus.SUCCEEDED);
        } catch (Exception e) {
            preview.setStatus(PreviewStatus.FAILED);
            preview.setErrorMessage(e.getMessage());
        }
        preview = previewRepository.save(preview);

        analyticsService.track("PREVIEW_GENERATED", RequestContext.getCurrentUserId().orElse(null),
                RequestContext.getSessionId().orElse(null), null, null,
                request.getRecommendationId(), request.getTryOnRequestId(), null);

        return toResponse(preview);
    }

    public PreviewResponse get(UUID id) {
        PreviewGeneration preview = previewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Preview không tồn tại"));
        verifyPreviewOwnership(preview);
        return toResponse(preview);
    }

    @Transactional
    public void delete(UUID id) {
        PreviewGeneration preview = previewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Preview không tồn tại"));
        verifyPreviewOwnership(preview);
        previewRepository.delete(preview);
    }

    /**
     * Previews carry no owner columns, so the owner is that of the linked recommendation, else try-on
     * (both follow the guest's session to the account on login), else photo upload.
     * A preview linked to nothing has no provable owner and is never accessible.
     */
    private void verifyPreviewOwnership(PreviewGeneration preview) {
        if (preview.getRecommendationId() != null) {
            verifyRecommendationOwnership(preview.getRecommendationId());
        } else if (preview.getTryOnRequestId() != null) {
            verifyTryOnOwnership(preview.getTryOnRequestId());
        } else if (preview.getPhotoUploadId() != null) {
            UserPhotoUpload upload = photoUploadRepository.findById(preview.getPhotoUploadId())
                    .orElseThrow(() -> new NotFoundException("Preview không tồn tại"));
            OwnershipChecker.verify(upload.getUserId(), upload.getSessionId());
        } else {
            OwnershipChecker.verify(null, null);
        }
    }

    private void verifyRecommendationOwnership(UUID recommendationId) {
        Recommendation rec = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
        OwnershipChecker.verify(rec.getUserId(), rec.getSessionId());
    }

    private void verifyTryOnOwnership(UUID tryOnRequestId) {
        TryOnRequest tryOn = tryOnRequestRepository.findById(tryOnRequestId)
                .orElseThrow(() -> new NotFoundException("Try-on không tồn tại"));
        OwnershipChecker.verify(tryOn.getUserId(), tryOn.getSessionId());
    }

    private PreviewResponse toResponse(PreviewGeneration p) {
        return PreviewResponse.builder()
                .id(p.getId())
                .previewType(p.getPreviewType())
                .status(p.getStatus())
                .previewImageUrl(p.getPreviewImageUrl())
                .errorMessage(p.getErrorMessage())
                .disclaimer(p.getDisclaimer())
                .build();
    }
}
