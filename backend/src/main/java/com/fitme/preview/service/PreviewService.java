package com.fitme.preview.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.OwnershipChecker;
import com.fitme.common.security.RequestContext;
import com.fitme.preview.dto.CreatePreviewRequest;
import com.fitme.preview.dto.PreviewResponse;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.repository.PreviewGenerationRepository;
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

    @Transactional
    public PreviewResponse create(CreatePreviewRequest request) {
        verifyLinkedResourceOwnership(request.getRecommendationId(), request.getTryOnRequestId());
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

    private void verifyPreviewOwnership(PreviewGeneration preview) {
        verifyLinkedResourceOwnership(preview.getRecommendationId(), preview.getTryOnRequestId());
    }

    private void verifyLinkedResourceOwnership(UUID recommendationId, UUID tryOnRequestId) {
        if (recommendationId != null) {
            Recommendation rec = recommendationRepository.findById(recommendationId)
                    .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
            OwnershipChecker.verify(rec.getUserId(), rec.getSessionId());
            return;
        }
        if (tryOnRequestId != null) {
            TryOnRequest tryOn = tryOnRequestRepository.findById(tryOnRequestId)
                    .orElseThrow(() -> new NotFoundException("Try-on không tồn tại"));
            OwnershipChecker.verify(tryOn.getUserId(), tryOn.getSessionId());
        }
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
