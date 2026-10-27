package com.fitme.community.service;

import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.repository.PreviewGenerationRepository;
import com.fitme.recommendation.entity.OutfitRequest;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.recommendation.repository.OutfitRequestRepository;
import com.fitme.recommendation.repository.RecommendationRepository;
import com.fitme.tryon.entity.TryOnRequest;
import com.fitme.tryon.repository.TryOnRequestRepository;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.repository.StyleProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Recovers the style and occasion behind a try-on photo so a published post can be labelled
 * with the same context the stylist used, instead of a generic "Outfit" placeholder.
 *
 * <p>The lookup walks the origin of the photo: a try-on request carries the occasion, the
 * recommendation that produced it carries the style label, and the user's style profile is the
 * fallback for photos taken without any recommendation.
 */
@Component
@RequiredArgsConstructor
public class CommunityPostContextResolver {

    private final TryOnRequestRepository tryOnRequestRepository;
    private final PreviewGenerationRepository previewGenerationRepository;
    private final RecommendationRepository recommendationRepository;
    private final OutfitRequestRepository outfitRequestRepository;
    private final StyleProfileRepository styleProfileRepository;

    /** Style and occasion shown on a published post. Either side may be null. */
    public record PostContext(String styleLabel, String occasion) {

        public static PostContext empty() {
            return new PostContext(null, null);
        }
    }

    /**
     * @param tryOnRequestId the try-on that produced the photo, if any
     * @param recommendationId the recommendation the photo came from, if any
     * @param userId the author, used for the style-profile fallback
     */
    public PostContext resolve(UUID tryOnRequestId, UUID recommendationId, UUID userId) {
        Recommendation recommendation = recommendationId != null
                ? recommendationRepository.findById(recommendationId).orElse(null)
                : null;

        // A try-on request is the most direct source: it holds the occasion the user picked.
        TryOnRequest tryOn = tryOnRequestId != null
                ? tryOnRequestRepository.findById(tryOnRequestId).orElse(null)
                : null;

        if (recommendation == null && tryOn != null) {
            recommendation = findRecommendationForTryOn(tryOn);
        }

        String styleLabel = recommendation == null ? null : blankToNull(recommendation.getStyleLabel());
        String occasion = null;

        if (recommendation != null) {
            occasion = occasionFromRecommendation(recommendation);
        }
        if (occasion == null && tryOn != null) {
            occasion = blankToNull(tryOn.getOccasion());
        }
        if (occasion == null) {
            // The style profile stores styles, not occasions, so the style is the best signal left.
            occasion = styleFromProfile(userId);
        }
        if (styleLabel == null) {
            styleLabel = styleFromProfile(userId);
        }

        return new PostContext(styleLabel, occasion);
    }

    /**
     * The recommendation that produced a try-on: the try-on points at a preview, and the preview
     * points at the recommendation the stylist generated.
     */
    private Recommendation findRecommendationForTryOn(TryOnRequest tryOn) {
        if (tryOn.getPreviewGenerationId() == null) {
            return null;
        }
        List<PreviewGeneration> previews =
                previewGenerationRepository.findByTryOnRequestId(tryOn.getId());
        for (PreviewGeneration preview : previews) {
            if (preview.getRecommendationId() != null) {
                Recommendation recommendation =
                        recommendationRepository.findById(preview.getRecommendationId()).orElse(null);
                if (recommendation != null) {
                    return recommendation;
                }
            }
        }
        return null;
    }

    /** The recommendation's explanation holds the human occasion; its outfit request holds the raw one. */
    private String occasionFromRecommendation(Recommendation recommendation) {
        String occasion = blankToNull(recommendation.getExplanationOccasion());
        if (occasion != null) {
            return occasion;
        }
        if (recommendation.getOutfitRequestId() == null) {
            return null;
        }
        return outfitRequestRepository.findById(recommendation.getOutfitRequestId())
                .map(OutfitRequest::getOccasion)
                .map(CommunityPostContextResolver::blankToNull)
                .orElse(null);
    }

    private String styleFromProfile(UUID userId) {
        if (userId == null) {
            return null;
        }
        return styleProfileRepository.findFirstByUserIdOrderByUpdatedAtDesc(userId)
                .map(StyleProfile::getPrimaryStyle)
                .map(CommunityPostContextResolver::blankToNull)
                .orElse(null);
    }

    private static String blankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
