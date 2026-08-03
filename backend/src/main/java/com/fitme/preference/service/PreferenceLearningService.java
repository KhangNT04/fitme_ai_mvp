package com.fitme.preference.service;

import com.fitme.common.enums.FeedbackRating;
import com.fitme.common.security.RequestContext;
import com.fitme.preference.entity.UserPreferenceWeights;
import com.fitme.preference.repository.UserPreferenceWeightsRepository;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.recommendation.entity.RecommendationItem;
import com.fitme.recommendation.repository.RecommendationItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PreferenceLearningService {

    private static final double LIKE_DELTA = 0.35;
    private static final double DISLIKE_DELTA = -0.4;
    private static final double SAVE_DELTA = 0.2;
    private static final double REDIRECT_DELTA = 0.25;
    private static final double MIN_WEIGHT = -2.0;
    private static final double MAX_WEIGHT = 3.0;

    private final UserPreferenceWeightsRepository weightsRepository;
    private final RecommendationItemRepository recommendationItemRepository;
    private final ProductRepository productRepository;

    public Map<String, Double> styleWeights() {
        return numericMap(load().getWeights(), "styles");
    }

    public Map<String, Double> brandWeights() {
        return numericMap(load().getWeights(), "brands");
    }

    public Map<String, Double> colorWeights() {
        return numericMap(load().getWeights(), "colors");
    }

    @Transactional
    public void applyRecommendationFeedback(UUID recommendationId, FeedbackRating rating, String styleLabel) {
        double delta = deltaFor(rating);
        if (delta == 0) {
            return;
        }
        UserPreferenceWeights row = findOrCreate();
        Map<String, Object> root = mutable(row.getWeights());
        Map<String, Double> styles = numericMap(root, "styles");
        Map<String, Double> brands = numericMap(root, "brands");
        Map<String, Double> colors = numericMap(root, "colors");

        if (styleLabel != null && !styleLabel.isBlank()) {
            bump(styles, styleLabel, delta);
        }

        List<RecommendationItem> items = recommendationItemRepository
                .findByRecommendationIdOrderBySortOrderAsc(recommendationId);
        for (RecommendationItem item : items) {
            if (item.getSelectedColor() != null && !item.getSelectedColor().isBlank()) {
                bump(colors, item.getSelectedColor(), delta * 0.6);
            }
            if (item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(p -> {
                    if (p.getBrandId() != null) {
                        bump(brands, p.getBrandId().toString(), delta);
                    }
                });
            }
        }

        root.put("styles", styles);
        root.put("brands", brands);
        root.put("colors", colors);
        row.setWeights(root);
        weightsRepository.save(row);
    }

    @Transactional
    public void applySaveSignal(UUID recommendationId, String styleLabel) {
        applySynthetic(recommendationId, styleLabel, SAVE_DELTA);
    }

    @Transactional
    public void applyRedirectSignal(UUID brandId, String color) {
        if (brandId == null && (color == null || color.isBlank())) {
            return;
        }
        UserPreferenceWeights row = findOrCreate();
        Map<String, Object> root = mutable(row.getWeights());
        Map<String, Double> brands = numericMap(root, "brands");
        Map<String, Double> colors = numericMap(root, "colors");
        if (brandId != null) {
            bump(brands, brandId.toString(), REDIRECT_DELTA);
        }
        if (color != null && !color.isBlank()) {
            bump(colors, color, REDIRECT_DELTA * 0.5);
        }
        root.put("brands", brands);
        root.put("colors", colors);
        row.setWeights(root);
        weightsRepository.save(row);
    }

    private void applySynthetic(UUID recommendationId, String styleLabel, double delta) {
        UserPreferenceWeights row = findOrCreate();
        Map<String, Object> root = mutable(row.getWeights());
        Map<String, Double> styles = numericMap(root, "styles");
        Map<String, Double> brands = numericMap(root, "brands");
        if (styleLabel != null && !styleLabel.isBlank()) {
            bump(styles, styleLabel, delta);
        }
        for (RecommendationItem item : recommendationItemRepository
                .findByRecommendationIdOrderBySortOrderAsc(recommendationId)) {
            if (item.getProductId() == null) continue;
            productRepository.findById(item.getProductId()).map(Product::getBrandId).ifPresent(id ->
                    bump(brands, id.toString(), delta));
        }
        root.put("styles", styles);
        root.put("brands", brands);
        row.setWeights(root);
        weightsRepository.save(row);
    }

    private UserPreferenceWeights load() {
        return findExisting().orElseGet(() -> UserPreferenceWeights.builder().weights(new HashMap<>()).build());
    }

    private UserPreferenceWeights findOrCreate() {
        return findExisting().orElseGet(() -> {
            UserPreferenceWeights created = UserPreferenceWeights.builder()
                    .weights(new HashMap<>())
                    .build();
            RequestContext.getCurrentUserId().ifPresent(created::setUserId);
            RequestContext.getSessionId().ifPresent(created::setSessionId);
            return created;
        });
    }

    private java.util.Optional<UserPreferenceWeights> findExisting() {
        return RequestContext.getCurrentUserId()
                .flatMap(weightsRepository::findFirstByUserIdOrderByUpdatedAtDesc)
                .or(() -> RequestContext.getSessionId()
                        .flatMap(weightsRepository::findFirstBySessionIdOrderByUpdatedAtDesc));
    }

    private static double deltaFor(FeedbackRating rating) {
        if (rating == null) {
            return 0;
        }
        return switch (rating) {
            case LIKE, VERY_USEFUL -> LIKE_DELTA;
            case OK -> LIKE_DELTA * 0.4;
            case DISLIKE, NOT_MY_STYLE, TOO_BASIC, TOO_BOLD, NOT_OCCASION_FIT, COLOR_NOT_FIT -> DISLIKE_DELTA;
            case SIZE_NOT_FIT -> DISLIKE_DELTA * 0.3;
        };
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Double> numericMap(Map<String, Object> root, String key) {
        Map<String, Double> out = new HashMap<>();
        if (root == null) {
            return out;
        }
        Object raw = root.get(key);
        if (raw instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> e : map.entrySet()) {
                if (e.getKey() == null || e.getValue() == null) continue;
                try {
                    out.put(e.getKey().toString(), Double.parseDouble(e.getValue().toString()));
                } catch (NumberFormatException ignored) {
                    // skip bad entries
                }
            }
        }
        return out;
    }

    private static Map<String, Object> mutable(Map<String, Object> weights) {
        return weights == null ? new HashMap<>() : new HashMap<>(weights);
    }

    private static void bump(Map<String, Double> map, String key, double delta) {
        double next = map.getOrDefault(key, 0.0) + delta;
        map.put(key, Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, next)));
    }
}
