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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiStylistService {

    private final FitMeProperties properties;
    private final GeminiStylistClient geminiStylistClient;
    private final StylistContextBuilder contextBuilder;
    private final GeminiOutfitValidator outfitValidator;
    private final SizeResolutionService sizeResolutionService;

    public StylistSuggestOutcome suggest(
            BodyProfile body,
            StyleProfile style,
            CreateRecommendationRequest request,
            List<WardrobeItem> wardrobe,
            List<Product> candidates,
            UUID selectedProductId) {
        if (!properties.getAi().isGeminiStylistEnabled()) {
            return StylistSuggestOutcome.fallback("stylist_disabled");
        }
        try {
            int limit = properties.getAi().getStylistCandidateLimit();
            List<Product> limitedCandidates = buildLimitedCandidates(candidates, selectedProductId, limit);

            String contextJson = contextBuilder.buildContext(
                    body, style, request, wardrobe, limitedCandidates, selectedProductId);
            var raw = geminiStylistClient.suggestOutfit(contextJson);
            if (raw.isEmpty()) {
                return StylistSuggestOutcome.fallback("gemini_empty");
            }
            GeminiOutfitSuggestion suggestion = raw.get();
            List<Product> validationCandidates =
                    expandCandidatesForSuggestion(limitedCandidates, candidates, suggestion);
            List<RecommendationResponse.OutfitItemDto> items =
                    outfitValidator.validateAndMap(suggestion, validationCandidates, body);

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
                wardrobeFit = null;
            }

            String explanationBody = exp != null ? exp.getNarrative() : null;
            if (explanationBody == null || explanationBody.isBlank()) {
                explanationBody = exp != null ? exp.getBodyFit() : null;
            }
            String explanationStyle = exp != null ? exp.getStyleFit() : null;
            String explanationOccasion = exp != null ? exp.getOccasionFit() : null;
            String explanationColor = exp != null ? exp.getColorFit() : null;
            if (exp != null && exp.getNarrative() != null && !exp.getNarrative().isBlank()) {
                explanationStyle = null;
                explanationOccasion = null;
                explanationColor = null;
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
                title = "Outfit phong cách " + styleLabel;
            }

            return StylistSuggestOutcome.success(new GeminiStylistResult(
                    title,
                    items,
                    recommendedSize,
                    altSize,
                    suggestion.getRecommendedForm() != null ? suggestion.getRecommendedForm() : "regular",
                    suggestion.getRecommendedColor() != null ? suggestion.getRecommendedColor() : "neutral",
                    confidence,
                    exp != null ? explanationBody : null,
                    explanationStyle,
                    explanationOccasion,
                    explanationColor,
                    wardrobeFit));
        } catch (IllegalArgumentException ex) {
            log.warn("Gemini stylist validation failed, will fallback to rules: reason=validation_failed message={}",
                    ex.getMessage());
            return StylistSuggestOutcome.fallback("validation_failed");
        } catch (Exception ex) {
            log.warn("Gemini stylist failed, will fallback to rules: reason=exception message={}", ex.getMessage());
            return StylistSuggestOutcome.fallback("exception");
        }
    }

    private static List<Product> buildLimitedCandidates(
            List<Product> candidates, UUID selectedProductId, int limit) {
        if (candidates.size() <= limit) {
            return candidates;
        }
        LinkedHashMap<UUID, Product> merged = new LinkedHashMap<>();
        if (selectedProductId != null) {
            candidates.stream()
                    .filter(product -> selectedProductId.equals(product.getId()))
                    .findFirst()
                    .ifPresent(product -> merged.put(product.getId(), product));
        }
        for (Product product : candidates) {
            if (merged.size() >= limit) {
                break;
            }
            merged.putIfAbsent(product.getId(), product);
        }
        return List.copyOf(merged.values());
    }

    private static List<Product> expandCandidatesForSuggestion(
            List<Product> limitedCandidates,
            List<Product> allCandidates,
            GeminiOutfitSuggestion suggestion) {
        Map<UUID, Product> merged = limitedCandidates.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        Map<UUID, Product> allById = allCandidates.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a));
        if (suggestion.getItems() != null) {
            for (GeminiOutfitSuggestion.Item item : suggestion.getItems()) {
                if (item.getProductId() == null || item.getProductId().isBlank()) {
                    continue;
                }
                UUID productId = UUID.fromString(item.getProductId());
                Product product = allById.get(productId);
                if (product != null) {
                    merged.putIfAbsent(productId, product);
                }
            }
        }
        return List.copyOf(merged.values());
    }
}
