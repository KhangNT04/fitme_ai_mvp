package com.fitme.gallery.service;

import com.fitme.common.dto.PageResult;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.TryOnStatus;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.gallery.dto.GalleryImageDto;
import com.fitme.gallery.dto.GalleryStatsDto;
import com.fitme.gallery.entity.OutfitGalleryImage;
import com.fitme.gallery.repository.OutfitGalleryImageRepository;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.repository.PreviewGenerationRepository;
import com.fitme.preview.service.VtonOutputMirrorService;
import com.fitme.product.entity.ProductImage;
import com.fitme.product.repository.ProductImageRepository;
import com.fitme.product.repository.ProductRepository;
import com.fitme.storage.StorageService;
import com.fitme.storage.StoredMediaPaths;
import com.fitme.tryon.entity.TryOnItem;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnItemRepository;
import com.fitme.tryon.repository.TryOnRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GalleryService {

    private static final String OWNED_MEDIA_PREFIX = "/uploads/vton-results/";

    private final OutfitGalleryImageRepository galleryRepository;
    private final TryOnRequestRepository tryOnRequestRepository;
    private final TryOnItemRepository tryOnItemRepository;
    private final PreviewGenerationRepository previewRepository;
    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final StorageService storageService;
    private final AppClock clock;

    /**
     * Saves a finished try-on image into the owner's gallery. Skips anonymous try-ons, failed
     * previews and ephemeral provider URLs that were not mirrored into our storage.
     */
    @Transactional
    public void recordTryOn(TryOnRequest tryOn, PreviewGeneration preview) {
        if (tryOn == null || preview == null || tryOn.getUserId() == null || preview.getId() == null) {
            return;
        }
        if (tryOn.getStatus() != TryOnStatus.COMPLETED || preview.getStatus() != PreviewStatus.SUCCEEDED) {
            return;
        }
        String imageUrl = preview.getPreviewImageUrl();
        if (imageUrl == null || imageUrl.isBlank() || VtonOutputMirrorService.isEphemeralVtonOutputUrl(imageUrl)) {
            return;
        }
        String productIds = tryOnItemRepository.findByTryOnRequestId(tryOn.getId()).stream()
                .map(TryOnItem::getProductId)
                .filter(Objects::nonNull)
                .map(UUID::toString)
                .distinct()
                .collect(Collectors.joining(","));
        galleryRepository.insertIfAbsent(tryOn.getUserId(), tryOn.getId(), preview.getId(), imageUrl.trim(),
                preview.getPreviewSource() != null ? preview.getPreviewSource().name() : null,
                productIds, clock.now());
    }

    /** A guest logged in and linked their session: their finished try-ons join the gallery. */
    @Transactional
    public void claimSessionTryOns(UUID sessionId, UUID userId) {
        for (TryOnRequest tryOn : tryOnRequestRepository.findBySessionId(sessionId)) {
            if (tryOn.getStatus() != TryOnStatus.COMPLETED || tryOn.getPreviewGenerationId() == null) {
                continue;
            }
            if (tryOn.getUserId() == null) {
                tryOn.setUserId(userId);
            }
            if (!userId.equals(tryOn.getUserId())) {
                continue;
            }
            previewRepository.findById(tryOn.getPreviewGenerationId())
                    .ifPresent(preview -> recordTryOn(tryOn, preview));
        }
    }

    public PageResult<GalleryImageDto> list(UUID userId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 60);
        return PageResult.of(
                galleryRepository.findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        userId, PageRequest.of(Math.max(page, 0), safeSize)),
                this::toDto);
    }

    @Transactional
    public void softDelete(UUID userId, UUID id) {
        OutfitGalleryImage image = galleryRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new NotFoundException("Ảnh không tồn tại trong thư viện"));
        image.setDeletedAt(clock.now());
        galleryRepository.save(image);
    }

    public boolean isOwnedBy(UUID galleryImageId, UUID userId) {
        return galleryRepository.findByIdAndUserIdAndDeletedAtIsNull(galleryImageId, userId).isPresent();
    }

    public GalleryStatsDto stats() {
        return GalleryStatsDto.builder()
                .totalImages(galleryRepository.countByDeletedAtIsNull())
                .imagesLast7Days(galleryRepository.countByDeletedAtIsNullAndCreatedAtAfter(
                        clock.now().minus(7, ChronoUnit.DAYS)))
                .usersWithImages(galleryRepository.countDistinctUsers())
                .build();
    }

    /** Privacy deletion: removes gallery rows and the mirrored try-on files we own in storage. */
    @Transactional
    public int purgeForUser(UUID userId) {
        List<OutfitGalleryImage> images = galleryRepository.findByUserId(userId);
        for (OutfitGalleryImage image : images) {
            String path = StoredMediaPaths.normalizeToUploadPath(image.getImageUrl());
            if (path != null && path.startsWith(OWNED_MEDIA_PREFIX)) {
                try {
                    storageService.delete(path);
                } catch (Exception ex) {
                    log.warn("Could not delete gallery media {}: {}", path, ex.getMessage());
                }
            }
        }
        galleryRepository.deleteAll(images);
        return images.size();
    }

    private GalleryImageDto toDto(OutfitGalleryImage image) {
        List<GalleryImageDto.ProductRef> products = parseProductIds(image.getProductIds()).stream()
                .map(productRepository::findById)
                .flatMap(java.util.Optional::stream)
                .map(product -> GalleryImageDto.ProductRef.builder()
                        .productId(product.getId())
                        .name(product.getName())
                        .imageUrl(productImageRepository.findByProductIdOrderBySortOrderAsc(product.getId()).stream()
                                .findFirst()
                                .map(ProductImage::getImageUrl)
                                .orElse(null))
                        .price(product.getPrice())
                        .build())
                .toList();
        return GalleryImageDto.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .tryOnRequestId(image.getTryOnRequestId())
                .previewSource(image.getPreviewSource())
                .products(products)
                .createdAt(image.getCreatedAt())
                .build();
    }

    private static List<UUID> parseProductIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> {
                    try {
                        return UUID.fromString(value);
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }
}
