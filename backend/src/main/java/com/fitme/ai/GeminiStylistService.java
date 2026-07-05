package com.fitme.ai;

import com.fitme.ai.client.GeminiStylistClient;
import com.fitme.ai.dto.GeminiOutfitSuggestion;
import com.fitme.ai.dto.GeminiStylistResult;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.Confidence;
import com.fitme.product.entity.Product;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.service.SizeResolutionService;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.wardrobe.entity.WardrobeItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiStylistService {

    private final FitMeProperties properties;
    private final GeminiStylistClient geminiStylistClient;
    private final StylistContextBuilder contextBuilder;
    private final GeminiOutfitValidator outfitValidator;
    private final SizeResolutionService sizeResolutionService;

    public Optional<GeminiStylistResult> suggest(
            BodyProfile body,
            StyleProfile style,
            CreateRecommendationRequest request,
            List<WardrobeItem> wardrobe,
            List<Product> candidates,
            UUID selectedProductId) {
        if (!properties.getAi().isGeminiStylistEnabled()) {
            return Optional.empty();
        }
        try {
            String contextJson = contextBuilder.buildContext(
                    body, style, request, wardrobe, candidates, selectedProductId);
            Optional<GeminiOutfitSuggestion> raw = geminiStylistClient.suggestOutfit(contextJson);
            if (raw.isEmpty()) {
                return Optional.empty();
            }
            GeminiOutfitSuggestion suggestion = raw.get();
            List<RecommendationResponse.OutfitItemDto> items =
                    outfitValidator.validateAndMap(suggestion, candidates, body);

            String recommendedSize = suggestion.getRecommendedSize();
            if (recommendedSize == null || recommendedSize.isBlank()) {
                recommendedSize = sizeResolutionService.recommendSize(body, items);
            }
            String altSize = suggestion.getAlternativeSize();
            if (altSize == null || altSize.isBlank()) {
                altSize = sizeResolutionService.altSize(recommendedSize);
            }

            GeminiOutfitSuggestion.Explanation exp = suggestion.getExplanation();
            String wardrobeFit = exp != null ? exp.getWardrobeFit() : null;
            if (wardrobe.isEmpty()) {
                wardrobeFit = null;
            } else if (wardrobeFit == null || wardrobeFit.isBlank()) {
                wardrobeFit = "Đã cân nhắc " + wardrobe.size() + " món từ tủ đồ của bạn.";
            }

            Confidence confidence = GeminiOutfitValidator.parseConfidence(suggestion.getConfidence());
            if (items.size() >= 3) {
                confidence = Confidence.HIGH;
            } else if (items.size() < 2) {
                confidence = Confidence.LOW;
            }

            String title = suggestion.getTitle();
            if (title == null || title.isBlank()) {
                String styleLabel = style.getPrimaryStyle() != null ? style.getPrimaryStyle() : "đa dạng";
                title = "Outfit " + request.getOccasion() + " phong cách " + styleLabel;
            }

            return Optional.of(new GeminiStylistResult(
                    title,
                    items,
                    recommendedSize,
                    altSize,
                    suggestion.getRecommendedForm() != null ? suggestion.getRecommendedForm() : "regular",
                    suggestion.getRecommendedColor() != null ? suggestion.getRecommendedColor() : "neutral",
                    confidence,
                    exp != null ? exp.getBodyFit() : null,
                    exp != null ? exp.getStyleFit() : null,
                    exp != null ? exp.getOccasionFit() : null,
                    exp != null ? exp.getColorFit() : null,
                    wardrobeFit));
        } catch (Exception ex) {
            log.warn("Gemini stylist failed, will fallback to rules: {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
