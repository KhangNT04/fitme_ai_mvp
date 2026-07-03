package com.fitme.preview.service;

import com.fitme.billing.service.BrandQuotaService;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.enums.TryOnStatus;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.repository.PreviewGenerationRepository;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.tryon.entity.TryOnItem;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnItemRepository;
import com.fitme.tryon.repository.TryOnRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VtonTryOnService {

    private final TryOnRequestRepository tryOnRequestRepository;
    private final TryOnItemRepository tryOnItemRepository;
    private final PreviewGenerationRepository previewRepository;
    private final PreviewGenerator previewGenerator;
    private final ProductRepository productRepository;
    private final BrandQuotaService brandQuotaService;

    @Transactional
    public void startJob(TryOnRequest tryOn) {
        PreviewGeneration preview = PreviewGeneration.builder()
                .tryOnRequestId(tryOn.getId())
                .photoUploadId(tryOn.getPhotoUploadId())
                .previewType(PreviewType.OUTFIT_BOARD)
                .status(PreviewStatus.PROCESSING)
                .build();
        preview = previewRepository.save(preview);
        tryOn.setPreviewGenerationId(preview.getId());

        try {
            PreviewGenerator.PreviewResult result = previewGenerator.generate(
                    new PreviewGenerator.PreviewRequest(null, tryOn.getId(), tryOn.getPhotoUploadId(),
                            PreviewType.OUTFIT_BOARD));
            preview.setPreviewImageUrl(result.imageUrl());
            preview.setDisclaimer(result.disclaimer());
            preview.setStatus(PreviewStatus.SUCCEEDED);
            tryOn.setStatus(TryOnStatus.COMPLETED);
            consumeQuotaForTryOn(tryOn.getId());
        } catch (Exception e) {
            preview.setStatus(PreviewStatus.FAILED);
            preview.setErrorMessage(e.getMessage());
            tryOn.setStatus(TryOnStatus.FAILED);
        }
        previewRepository.save(preview);
        tryOnRequestRepository.save(tryOn);
    }

    public void pollProcessingJobs() {
        // Synchronous mock VTON completes in startJob; async providers can hook here later.
    }

    public Optional<PreviewGeneration> findPreviewForTryOn(UUID tryOnRequestId) {
        List<PreviewGeneration> previews = previewRepository.findByTryOnRequestId(tryOnRequestId);
        if (previews.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(previews.getLast());
    }

    private void consumeQuotaForTryOn(UUID tryOnRequestId) {
        Set<UUID> brandIds = new LinkedHashSet<>();
        for (TryOnItem item : tryOnItemRepository.findByTryOnRequestId(tryOnRequestId)) {
            productRepository.findById(item.getProductId())
                    .map(Product::getBrandId)
                    .ifPresent(brandIds::add);
        }
        brandQuotaService.consumeForTryOn(tryOnRequestId, brandIds);
    }
}
