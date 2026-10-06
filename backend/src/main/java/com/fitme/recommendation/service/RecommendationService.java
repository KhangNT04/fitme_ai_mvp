package com.fitme.recommendation.service;

import com.fitme.ai.GeminiStylistService;
import com.fitme.ai.StylistSuggestOutcome;
import com.fitme.ai.dto.GeminiStylistResult;
import com.fitme.analytics.service.AnalyticsService;
import com.fitme.brand.service.BrandPartnershipService;
import com.fitme.common.enums.Confidence;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.ProductTargetGender;
import com.fitme.common.enums.RecommendationStatus;
import com.fitme.common.enums.SourceType;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.OwnershipChecker;
import com.fitme.common.security.RequestContext;
import com.fitme.entitlement.service.ConsumerEntitlementService;
import com.fitme.preference.service.BrandPreferenceService;
import com.fitme.preference.service.PreferenceLearningService;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.service.ProductAudienceService;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.dto.RecommendationOptionsResponse;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.entity.OutfitRequest;
import com.fitme.recommendation.entity.Recommendation;
import com.fitme.recommendation.entity.RecommendationItem;
import com.fitme.recommendation.repository.OutfitRequestRepository;
import com.fitme.recommendation.repository.RecommendationItemRepository;
import com.fitme.recommendation.repository.RecommendationRepository;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.service.BodyProfileService;
import com.fitme.wardrobe.entity.WardrobeItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private static final String DEFAULT_OCCASION = "Casual hàng ngày";
    private static final int MIN_BUDGET_POOL = 8;

    private final OutfitRequestRepository outfitRequestRepository;
    private final RecommendationRepository recommendationRepository;
    private final RecommendationItemRepository recommendationItemRepository;
    private final ProductRepository productRepository;
    private final ProductEligibilityService eligibilityService;
    private final BodyProfileService bodyProfileService;
    private final AnalyticsService analyticsService;
    private final WardrobeBlendService wardrobeBlendService;
    private final OutfitScoringService outfitScoringService;
    private final OutfitCompositionService outfitCompositionService;
    private final SizeResolutionService sizeResolutionService;
    private final GeminiStylistService geminiStylistService;
    private final OutfitExplanationComposer explanationComposer;
    private final ProductAudienceService productAudienceService;
    private final UserStylingContextService userStylingContextService;
    private final ConsumerEntitlementService consumerEntitlementService;
    private final BrandPartnershipService brandPartnershipService;
    private final PreferenceLearningService preferenceLearningService;
    private final BrandPreferenceService brandPreferenceService;

    @Transactional
    public RecommendationOptionsResponse generate(CreateRecommendationRequest request) {
        return generateInternal(request).options();
    }

    /**
     * Chat-driven generation: uses user message + intent styles, returns options
     * and full recommendation payloads for inline chat cards.
     */
    @Transactional
    public ChatGenerationResult generateFromChat(CreateRecommendationRequest request) {
        return generateInternal(request);
    }

    private ChatGenerationResult generateInternal(CreateRecommendationRequest request) {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = request.getSessionId() != null ? request.getSessionId()
                : RequestContext.getSessionId().orElse(null);
        if (userId == null && sessionId == null) {
            throw new BusinessException("Yêu cầu đăng nhập hoặc session ẩn danh");
        }

        BodyProfile body = bodyProfileService.findProfileEntity()
                .orElseThrow(() -> new BusinessException("Vui lòng cập nhật body profile trước"));

        String occasion = request.getOccasion() != null && !request.getOccasion().isBlank()
                ? request.getOccasion()
                : DEFAULT_OCCASION;
        // Wardrobe is Premium-only: Free users asking for it silently get brand-only outfits.
        WardrobeMode mode = consumerEntitlementService.effectiveWardrobeMode(request.getWardrobeMode(), userId);

        UUID selectedProductId = request.getSelectedProductId();
        if (selectedProductId != null && productRepository.findById(selectedProductId).isEmpty()) {
            selectedProductId = null;
        }

        OutfitRequest outfitRequest = OutfitRequest.builder()
                .userId(userId)
                .sessionId(sessionId)
                .selectedProductId(selectedProductId)
                .occasion(occasion)
                .desiredVibe(request.getDesiredVibe())
                .userMessage(request.getUserMessage())
                .conversationId(request.getConversationId())
                .wardrobeMode(mode)
                .budgetMin(request.getBudgetMin())
                .budgetMax(request.getBudgetMax())
                .build();
        outfitRequest = outfitRequestRepository.save(outfitRequest);

        List<WardrobeItem> wardrobe = wardrobeBlendService.loadWardrobe(userId, sessionId, mode);
        List<Product> audienceEligible = productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(eligibilityService::canBeRecommended)
                .filter(p -> productAudienceService.isRecommendableFor(body, p))
                .toList();
        List<Product> withinBudget = audienceEligible.stream()
                .filter(p -> outfitScoringService.withinBudget(p, request.getBudgetMin(), request.getBudgetMax()))
                .toList();
        // A tight budget on a small catalog can leave nothing to build a full outfit from.
        List<Product> budgetPool = withinBudget.size() >= MIN_BUDGET_POOL ? withinBudget : audienceEligible;

        Product anchor = selectedProductId != null
                ? productRepository.findById(selectedProductId).orElse(null) : null;
        if (anchor != null && !productAudienceService.isRecommendableFor(body, anchor)) {
            throw new BusinessException("Sản phẩm đã chọn không phù hợp với giới tính trong hồ sơ của bạn.");
        }

        OutfitScoreContext scoreContext = buildScoreContext(anchor, userId);
        List<Product> baseEligible = applyFavoriteBrandFilter(budgetPool, scoreContext);

        CreateRecommendationRequest stylistRequest = copyRequest(request, occasion);
        stylistRequest.setWardrobeMode(mode);
        List<String> styles = resolveStyleLabels(request, body);
        List<RecommendationOptionsResponse.StyleOptionDto> options = new ArrayList<>();
        List<RecommendationResponse> recommendations = new ArrayList<>();

        for (String styleLabel : styles) {
            StyleProfile styleForOption = StyleProfile.builder().primaryStyle(styleLabel).build();
            List<Product> eligible = applyCoherenceAndSort(
                    baseEligible, styleLabel, body, request.getUserMessage(), scoreContext);

            RecommendationResponse full = generateSingleStyle(
                    outfitRequest.getId(),
                    userId,
                    sessionId,
                    body,
                    styleForOption,
                    styleLabel,
                    occasion,
                    stylistRequest,
                    wardrobe,
                    mode,
                    eligible,
                    baseEligible,
                    anchor,
                    selectedProductId,
                    scoreContext);

            if (full == null
                    || full.getOutfitItems() == null
                    || full.getOutfitItems().isEmpty()) {
                log.warn("Skipping empty outfit recommendation for style={} occasion={}",
                        styleLabel, occasion);
                continue;
            }

            String preview = full.getOutfitItems().stream()
                    .map(RecommendationResponse.OutfitItemDto::getImageUrl)
                    .filter(url -> url != null && !url.isBlank())
                    .findFirst()
                    .orElse(null);

            options.add(RecommendationOptionsResponse.StyleOptionDto.builder()
                    .recommendationId(full.getRecommendationId())
                    .styleLabel(styleLabel)
                    .title(full.getTitle())
                    .previewImageUrl(preview)
                    .itemCount(full.getOutfitItems().size())
                    .stylistSource(full.getStylistSource())
                    .build());
            recommendations.add(full);
        }

        analyticsService.track(
                "RECOMMENDATION_GENERATED", userId, sessionId, null, null,
                options.isEmpty() ? null : options.getFirst().getRecommendationId(), null, null);

        RecommendationOptionsResponse optionsResponse = RecommendationOptionsResponse.builder()
                .requestId(outfitRequest.getId())
                .options(options)
                .build();
        return new ChatGenerationResult(optionsResponse, recommendations);
    }

    public record ChatGenerationResult(
            RecommendationOptionsResponse options,
            List<RecommendationResponse> recommendations) {
    }

    private List<String> resolveStyleLabels(CreateRecommendationRequest request, BodyProfile body) {
        List<String> resolved;
        if (request.getStyleLabels() != null && !request.getStyleLabels().isEmpty()) {
            resolved = userStylingContextService.harmonizeStylesWithProfile(
                    body,
                    request.getUserMessage(),
                    request.getStyleLabels());
        } else {
            resolved = userStylingContextService.suggestDefaultStyles(body, request.getUserMessage(), List.of());
        }
        return request.isSingleStyle() ? resolved.stream().limit(1).toList() : resolved;
    }

    /**
     * @return full recommendation, or {@code null} when no products could be composed
     */
    private RecommendationResponse generateSingleStyle(
            UUID outfitRequestId,
            UUID userId,
            UUID sessionId,
            BodyProfile body,
            StyleProfile style,
            String styleLabel,
            String occasion,
            CreateRecommendationRequest request,
            List<WardrobeItem> wardrobe,
            WardrobeMode mode,
            List<Product> eligible,
            List<Product> baseEligible,
            Product anchor,
            UUID selectedProductId,
            OutfitScoreContext scoreContext) {

        List<RecommendationResponse.OutfitItemDto> items = null;
        String title = null;
        String recommendedSize = null;
        String altSize = null;
        String recommendedForm = null;
        String recommendedColor = null;
        Confidence confidence = null;
        String explanationBody = null;
        String explanationStyle = null;
        String explanationOccasion = null;
        String explanationColor = null;
        String explanationWardrobe = null;
        String stylistSource = "rule";

        StylistSuggestOutcome stylistOutcome = geminiStylistService.suggest(
                body, style, request, wardrobe, eligible, selectedProductId, scoreContext);
        if (stylistOutcome.result().isPresent()) {
            GeminiStylistResult gemini = stylistOutcome.result().get();
            if (gemini.items() != null && !gemini.items().isEmpty()) {
                stylistSource = "gemini";
                items = gemini.items();
                title = gemini.title();
                recommendedSize = gemini.recommendedSize();
                altSize = gemini.alternativeSize();
                recommendedForm = gemini.recommendedForm();
                recommendedColor = gemini.recommendedColor();
                confidence = gemini.confidence();
                explanationBody = gemini.explanationBody();
                explanationStyle = gemini.explanationStyle();
                explanationOccasion = gemini.explanationOccasion();
                explanationColor = gemini.explanationColor();
                explanationWardrobe = gemini.explanationWardrobe();
                if (explanationBody == null || explanationBody.isBlank()
                        || hasExplanationFragments(explanationStyle, explanationOccasion, explanationColor)) {
                    explanationBody = explanationComposer.composeForCustomer(
                            body, style, occasion, request.getDesiredVibe(),
                            recommendedSize, altSize, recommendedForm, recommendedColor,
                            wardrobe.size(), title, toItemRefs(items));
                    explanationStyle = null;
                    explanationOccasion = null;
                    explanationColor = null;
                }
            } else {
                log.info("Gemini returned no mappable items for style={}, falling back to rules", styleLabel);
            }
        }

        if (items == null || items.isEmpty()) {
            if (stylistOutcome.fallbackReason() != null) {
                log.info("Stylist fallback to rule engine: reason={} style={} candidateCount={}",
                        stylistOutcome.fallbackReason(), styleLabel, eligible.size());
            }
            items = outfitCompositionService.buildOutfit(
                    anchor, eligible, wardrobe, mode, body, style);
            // Wider catalog retry when style/coherence scoring left the pool too thin.
            if (items.isEmpty() && baseEligible != null && baseEligible != eligible && !baseEligible.isEmpty()) {
                log.info("Retrying outfit composition with full eligible pool for style={}", styleLabel);
                items = outfitCompositionService.buildOutfit(
                        anchor, baseEligible, wardrobe, mode, body, style);
            }
            recommendedSize = anchor != null
                    ? sizeResolutionService.resolveSize(body, anchor.getId())
                    : sizeResolutionService.recommendSize(body, items);
            altSize = sizeResolutionService.altSize(recommendedSize);
            recommendedForm = outfitCompositionService.recommendForm(body, style, occasion);
            recommendedColor = outfitCompositionService.recommendColor(style, items);
            confidence = items.size() >= 3 ? Confidence.HIGH : items.size() >= 2 ? Confidence.MEDIUM : Confidence.LOW;
            title = "Outfit phong cách " + styleLabel;
            explanationBody = explanationComposer.composeForCustomer(
                    body, style, occasion, request.getDesiredVibe(),
                    recommendedSize, altSize, recommendedForm, recommendedColor,
                    wardrobe.size(), title, toItemRefs(items));
            explanationStyle = null;
            explanationOccasion = null;
            explanationColor = null;
            explanationWardrobe = null;
            stylistSource = "rule";
        }

        if (items == null || items.isEmpty()) {
            return null;
        }

        if (title == null || title.isBlank()) {
            title = "Outfit phong cách " + styleLabel;
        }

        Recommendation rec = Recommendation.builder()
                .outfitRequestId(outfitRequestId)
                .userId(userId)
                .sessionId(sessionId)
                .title(title)
                .styleLabel(styleLabel)
                .recommendedSize(recommendedSize)
                .alternativeSize(altSize)
                .recommendedForm(recommendedForm)
                .recommendedColor(recommendedColor)
                .confidence(confidence)
                .explanationBody(explanationBody)
                .explanationStyle(explanationStyle)
                .explanationOccasion(explanationOccasion)
                .explanationColor(explanationColor)
                .explanationWardrobe(explanationWardrobe)
                .status(RecommendationStatus.GENERATED.name())
                .stylistSource(stylistSource)
                .build();
        rec = recommendationRepository.save(rec);

        int sort = 0;
        for (RecommendationResponse.OutfitItemDto item : items) {
            recommendationItemRepository.save(RecommendationItem.builder()
                    .recommendationId(rec.getId())
                    .productId(item.getProductId())
                    .wardrobeItemId(item.getWardrobeItemId())
                    .role(item.getRole())
                    .sourceType(item.getSourceType())
                    .displayName(item.getDisplayName())
                    .selectedSize(item.getSelectedSize())
                    .selectedColor(item.getSelectedColor())
                    .price(item.getPrice())
                    .sortOrder(sort++)
                    .build());
        }

        return outfitCompositionService.toResponse(rec, items);
    }

    public RecommendationOptionsResponse getOptionsByRequestId(UUID requestId) {
        OutfitRequest request = outfitRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Outfit request không tồn tại"));
        OwnershipChecker.verify(request.getUserId(), request.getSessionId());

        List<Recommendation> recs = recommendationRepository.findByOutfitRequestId(requestId).stream()
                .sorted(Comparator.comparing(Recommendation::getCreatedAt))
                .toList();

        List<RecommendationOptionsResponse.StyleOptionDto> options = new ArrayList<>();
        for (Recommendation rec : recs) {
            List<RecommendationResponse.OutfitItemDto> items = recommendationItemRepository
                    .findByRecommendationIdOrderBySortOrderAsc(rec.getId()).stream()
                    .map(outfitCompositionService::toOutfitItem)
                    .toList();
            String preview = items.stream()
                    .map(RecommendationResponse.OutfitItemDto::getImageUrl)
                    .filter(url -> url != null && !url.isBlank())
                    .findFirst()
                    .orElse(null);
            options.add(RecommendationOptionsResponse.StyleOptionDto.builder()
                    .recommendationId(rec.getId())
                    .styleLabel(rec.getStyleLabel() != null ? rec.getStyleLabel() : "Outfit")
                    .title(rec.getTitle())
                    .previewImageUrl(preview)
                    .itemCount(items.size())
                    .stylistSource(rec.getStylistSource())
                    .build());
        }

        return RecommendationOptionsResponse.builder()
                .requestId(requestId)
                .options(options)
                .build();
    }

    public RecommendationResponse getById(UUID id) {
        Recommendation rec = getOwnedRecommendation(id);
        List<RecommendationResponse.OutfitItemDto> items = recommendationItemRepository
                .findByRecommendationIdOrderBySortOrderAsc(id).stream()
                .map(outfitCompositionService::toOutfitItem)
                .toList();
        return outfitCompositionService.toResponse(rec, items);
    }

    @Transactional
    public void save(UUID id) {
        Recommendation rec = getOwnedRecommendation(id);
        RequestContext.getCurrentUserId().ifPresent(userId -> {
            if (rec.getUserId() == null) {
                rec.setUserId(userId);
            }
        });
        rec.setSaved(true);
        recommendationRepository.save(rec);
        preferenceLearningService.applySaveSignal(id, rec.getStyleLabel());
        analyticsService.track("OUTFIT_SAVED", rec.getUserId(), rec.getSessionId(), null, null, id, null, null);
    }

    @Transactional
    public void unsave(UUID id) {
        Recommendation rec = getOwnedRecommendation(id);
        if (!rec.isSaved()) {
            return;
        }
        rec.setSaved(false);
        recommendationRepository.save(rec);
    }

    public List<RecommendationResponse> getSaved() {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId == null && sessionId == null) {
            return List.of();
        }
        LinkedHashMap<UUID, Recommendation> merged = new LinkedHashMap<>();
        if (userId != null) {
            recommendationRepository.findByUserIdAndSavedTrue(userId)
                    .forEach(rec -> merged.putIfAbsent(rec.getId(), rec));
        }
        if (sessionId != null) {
            recommendationRepository.findBySessionIdAndSavedTrue(sessionId)
                    .forEach(rec -> merged.putIfAbsent(rec.getId(), rec));
        }
        return merged.values().stream()
                .sorted(Comparator.comparing(Recommendation::getCreatedAt).reversed())
                .map(rec -> getById(rec.getId()))
                .toList();
    }

    public List<RecommendationResponse.OutfitItemDto> similarProducts(UUID id) {
        getOwnedRecommendation(id);
        Set<UUID> anchorIds = recommendationItemRepository.findByRecommendationIdOrderBySortOrderAsc(id).stream()
                .map(RecommendationItem::getProductId)
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        List<Product> anchors = productRepository.findAllById(anchorIds);
        Set<ProductTargetGender> anchorGenders = anchors.stream()
                .map(productAudienceService::resolveTargetGender)
                .filter(g -> g != ProductTargetGender.UNISEX)
                .collect(java.util.stream.Collectors.toSet());
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(p -> !anchorIds.contains(p.getId()))
                .filter(eligibilityService::canBeRecommended)
                .filter(p -> genderCompatible(productAudienceService.resolveTargetGender(p), anchorGenders))
                .map(p -> java.util.Map.entry(p, similarityScore(p, anchors)))
                .filter(e -> anchors.isEmpty() || e.getValue() > 0)
                .sorted(java.util.Map.Entry.<Product, Integer>comparingByValue().reversed())
                .limit(6)
                .map(java.util.Map.Entry::getKey)
                .map(p -> RecommendationResponse.OutfitItemDto.builder()
                        .productId(p.getId())
                        .role(outfitCompositionService.guessRole(p))
                        .sourceType(SourceType.BRAND_PRODUCT)
                        .displayName(p.getName())
                        .price(p.getPrice())
                        .canBuy(eligibilityService.canShowBuyButton(p))
                        .imageUrl(outfitCompositionService.resolveProductImageUrl(p.getId()))
                        .build())
                .toList();
    }

    private static boolean genderCompatible(ProductTargetGender candidate, Set<ProductTargetGender> anchorGenders) {
        return candidate == ProductTargetGender.UNISEX || anchorGenders.isEmpty() || anchorGenders.contains(candidate);
    }

    private int similarityScore(Product candidate, List<Product> anchors) {
        int best = 0;
        for (Product anchor : anchors) {
            int score = 0;
            if (candidate.getCategory() != null && candidate.getCategory().equalsIgnoreCase(anchor.getCategory())) {
                score += 3;
            }
            if (outfitCompositionService.guessRole(candidate) == outfitCompositionService.guessRole(anchor)) {
                score += 2;
            }
            if (score == 0) continue;
            if (candidate.getBrandId() != null && candidate.getBrandId().equals(anchor.getBrandId())) {
                score += 1;
            }
            if (candidate.getPrice() != null && anchor.getPrice() != null && anchor.getPrice().signum() > 0) {
                double ratio = candidate.getPrice().doubleValue() / anchor.getPrice().doubleValue();
                if (ratio >= 0.7 && ratio <= 1.3) score += 1;
            }
            best = Math.max(best, score);
        }
        return best;
    }

    private OutfitScoreContext buildScoreContext(Product anchor, UUID userId) {
        OutfitCoherenceMode mode = consumerEntitlementService.resolveCoherenceModeForCurrentUser();
        double preferenceScale = consumerEntitlementService.resolvePreferenceScaleForCurrentUser();
        UUID preferredBrandId = resolvePreferredBrandId(anchor);
        Set<UUID> partners = brandPartnershipService.findPartnerBrandIds(preferredBrandId);
        BrandPreferenceService.ScoringPreference favorites = brandPreferenceService.forScoring(userId);
        return new OutfitScoreContext(
                mode,
                preferredBrandId,
                partners,
                preferenceLearningService.styleWeights(),
                preferenceLearningService.brandWeights(),
                preferenceLearningService.colorWeights(),
                preferenceScale,
                favorites.favoriteBrandIds(),
                favorites.mode());
    }

    /**
     * FAVORITES_ONLY soft filter: keep only favorite-brand products when they can still form an outfit
     * (top + bottom, or a one-piece); otherwise keep the full pool and rely on scoring to rank favorites first.
     */
    List<Product> applyFavoriteBrandFilter(List<Product> pool, OutfitScoreContext scoreContext) {
        if (!scoreContext.favoritesOnly()) {
            return pool;
        }
        List<Product> favorites = pool.stream()
                .filter(p -> outfitScoringService.isFavoriteBrand(p, scoreContext))
                .toList();
        return hasCoreOutfitRoles(favorites) ? favorites : pool;
    }

    private boolean hasCoreOutfitRoles(List<Product> products) {
        Set<ItemRole> roles = products.stream()
                .map(outfitCompositionService::guessRole)
                .collect(java.util.stream.Collectors.toSet());
        return roles.contains(ItemRole.ONE_PIECE)
                || (roles.contains(ItemRole.TOP) && roles.contains(ItemRole.BOTTOM));
    }

    private UUID resolvePreferredBrandId(Product anchor) {
        if (anchor != null && anchor.getBrandId() != null) {
            return anchor.getBrandId();
        }
        return preferenceLearningService.brandWeights().entrySet().stream()
                .max(Comparator.comparingDouble(java.util.Map.Entry::getValue))
                .map(e -> {
                    try {
                        return UUID.fromString(e.getKey());
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .orElse(null);
    }

    private List<Product> applyCoherenceAndSort(
            List<Product> baseEligible,
            String styleLabel,
            BodyProfile body,
            String userMessage,
            OutfitScoreContext scoreContext) {
        List<Product> pool = baseEligible;
        if (scoreContext.coherenceMode() == OutfitCoherenceMode.STRICT
                && scoreContext.preferredBrandId() != null) {
            List<Product> filtered = baseEligible.stream()
                    .filter(p -> outfitScoringService.matchesCoherenceFilter(p, scoreContext))
                    .toList();
            if (!filtered.isEmpty()) {
                pool = filtered;
            }
        }
        java.util.Map<Product, Double> scores = new java.util.IdentityHashMap<>();
        for (Product p : pool) {
            scores.put(p, outfitScoringService.scoreProduct(p, styleLabel, body, userMessage, scoreContext));
        }
        return pool.stream()
                .sorted((a, b) -> Double.compare(scores.get(b), scores.get(a)))
                .toList();
    }

    private static CreateRecommendationRequest copyRequest(CreateRecommendationRequest source, String occasion) {
        CreateRecommendationRequest copy = new CreateRecommendationRequest();
        copy.setSessionId(source.getSessionId());
        copy.setSelectedProductId(source.getSelectedProductId());
        copy.setOccasion(occasion);
        copy.setDesiredVibe(source.getDesiredVibe());
        copy.setWardrobeMode(source.getWardrobeMode());
        copy.setBudgetMin(source.getBudgetMin());
        copy.setBudgetMax(source.getBudgetMax());
        copy.setUserMessage(source.getUserMessage());
        copy.setConversationId(source.getConversationId());
        copy.setStyleLabels(source.getStyleLabels());
        copy.setConversationHistory(source.getConversationHistory());
        return copy;
    }

    private static boolean hasExplanationFragments(String style, String occasion, String color) {
        return isNotBlank(style) || isNotBlank(occasion) || isNotBlank(color);
    }

    private static List<OutfitExplanationComposer.OutfitItemRef> toItemRefs(
            List<RecommendationResponse.OutfitItemDto> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        return items.stream()
                .map(item -> new OutfitExplanationComposer.OutfitItemRef(
                        item.getDisplayName(),
                        null,
                        item.getRole(),
                        item.getSelectedColor()))
                .toList();
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    private Recommendation getOwnedRecommendation(UUID id) {
        Recommendation rec = recommendationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recommendation không tồn tại"));
        OwnershipChecker.verify(rec.getUserId(), rec.getSessionId());
        return rec;
    }
}
