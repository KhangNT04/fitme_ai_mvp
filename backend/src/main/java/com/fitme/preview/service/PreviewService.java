package com.fitme.preview.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.preview.dto.CreatePreviewRequest;
import com.fitme.preview.dto.PreviewResponse;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.repository.PreviewGenerationRepository;
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

    @Transactional
    public PreviewResponse create(CreatePreviewRequest request) {
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
                            request.getTryOnRequestId(), request.getPhotoUploadId(), type));
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
        return toResponse(previewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Preview không tồn tại")));
    }

    @Transactional
    public void delete(UUID id) {
        previewRepository.deleteById(id);
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
