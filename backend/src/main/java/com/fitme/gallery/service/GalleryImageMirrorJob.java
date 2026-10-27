package com.fitme.gallery.service;

import com.fitme.common.time.AppClock;
import com.fitme.gallery.entity.OutfitGalleryImage;
import com.fitme.gallery.repository.OutfitGalleryImageRepository;
import com.fitme.preview.service.VtonOutputMirrorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Keeps gallery images alive by re-mirroring rows that still point at a temporary
 * provider URL (FASHN's CDN, ai-vton's {@code /outputs/} folder).
 *
 * <p>Those links are removed by the provider after a short while, which used to leave
 * broken images in the owner's gallery. The job copies the bytes into our own storage
 * and repoints the row at the mirrored URL. Rows whose source is already gone are
 * dropped so the gallery does not show permanently broken thumbnails.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GalleryImageMirrorJob {

    /** Provider URLs we know expire; everything else is assumed permanent. */
    private static final List<String> EPHEMERAL_PREFIXES = List.of(
            "https://cdn.fashn.ai/",
            "http://cdn.fashn.ai/",
            "https://fitme-ai-vton.onrender.com/outputs/");

    private final OutfitGalleryImageRepository galleryRepository;
    private final VtonOutputMirrorService mirrorService;
    private final AppClock clock;

    @Scheduled(cron = "0 */20 * * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void mirrorEphemeralGalleryImages() {
        for (String prefix : EPHEMERAL_PREFIXES) {
            List<OutfitGalleryImage> candidates = galleryRepository.findByImageUrlPrefix(prefix);
            if (candidates.isEmpty()) {
                continue;
            }
            for (OutfitGalleryImage image : candidates) {
                mirrorOne(image);
            }
        }
    }

    private void mirrorOne(OutfitGalleryImage image) {
        String sourceUrl = image.getImageUrl();
        try {
            String mirrored = mirrorService.persistRemoteOutput(sourceUrl, image.getPreviewGenerationId());
            if (mirrored != null && !mirrored.equals(sourceUrl)) {
                image.setImageUrl(mirrored);
                galleryRepository.save(image);
                log.info("Re-mirrored gallery image {} to {}", image.getId(), mirrored);
            }
        } catch (Exception ex) {
            // The provider already dropped the file — the row can never render again.
            log.warn("Could not re-mirror gallery image {}: {}", image.getId(), ex.getMessage());
            softDelete(image);
        }
    }

    /**
     * Hides the row instead of deleting it: the photo is already gone from the provider, so
     * keeping the record lets us restore it later if the user re-generates the outfit.
     */
    private void softDelete(OutfitGalleryImage image) {
        image.setDeletedAt(clock.now());
        galleryRepository.save(image);
    }
}
