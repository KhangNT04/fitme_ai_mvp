package com.fitme.recommendation.service;

import com.fitme.ai.GeminiStylistService;
import com.fitme.ai.StylistSuggestOutcome;
import com.fitme.ai.dto.GeminiStylistResult;
import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.Confidence;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.enums.RecommendationStatus;
import com.fitme.common.enums.SourceType;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.OwnershipChecker;
import com.fitme.common.security.RequestContext;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private static final String DEFAULT_OCCASION = "Casual hàng ngày";

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

    @Transactional
    public RecommendationOptionsResponse generate(CreateRecommendationRequest request) {
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
        WardrobeMode mode = request.getWardrobeMode() != null
                ? request.getWardrobeMode()
                : WardrobeMode.NO_WARDROBE_DATA;

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
        List<Product> baseEligible = productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(eligibilityService::canBeRecommended)
                .filter(p -> productAudienceService.isRecommendableFor(body, p))
                .filter(p -> outfitScoringService.withinBudget(p, request.getBudgetMin(), request.getBudgetMax()))
                .toList();

        Product anchor = selectedProductId != null
                ? productRepository.findById(selectedProductId).orElse(null) : null;
        if (anchor != null && !productAudienceService.isRecommendableFor(body, anchor)) {
            throw new BusinessException("Sản phẩm đã chọn không phù hợp với giới tính trong hồ sơ của bạn.");
        }

        CreateRecommendationRequest stylistRequest = copyRequest(request, occasion);
        List<String> styles = resolveStyleLabels(request, body);
        List<RecommendationOptionsResponse.StyleOptionDto> options = new ArrayList<>();

        for (String styleLabel : styles) {
            StyleProfile styleForOption = StyleProfile.builder().primaryStyle(styleLabel).build();
            List<Product> eligible = baseEligible.stream()
                    .sorted((a, b) -> Double.compare(
                            outfitScoringService.scoreProduct(b, styleLabel, body, request.getUserMessage()),
                            outfitScoringService.scoreProduct(a, styleLabel, body, request.getUserMessage())))
                    .toList();

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
                    anchor,
                    selectedProductId);

            String preview = full.getOutfitItems() == null ? null
                    : full.getOutfitItems().stream()
                    .map(RecommendationResponse.OutfitItemDto::getImageUrl)
                    .filter(url -> url != null && !url.isBlank())
                    .findFirst()
                    .orElse(null);

            options.add(RecommendationOptionsResponse.StyleOptionDto.builder()
                    .recommendationId(full.getRecommendationId())
                    .styleLabel(styleLabel)
                    .title(full.getTitle())
                    .previewImageUrl(preview)
                    .itemCount(full.getOutfitItems() != null ? full.getOutfitItems().size() : 0)
                    .stylistSource(full.getStylistSource())
                    .build());
        }

        analyticsService.track(
                "RECOMMENDATION_GENERATED", userId, sessionId, null, null,
                options.isEmpty() ? null : options.getFirst().getRecommendationId(), null, null);

        return RecommendationOptionsResponse.builder()
                .requestId(outfitRequest.getId())
                .options(options)
                .build();
    }

    /**
     * Chat-driven generation: uses user message + intent styles, returns options
     * and full recommendation payloads for inline chat cards.
     */
    @Transactional
    public ChatGenerationResult generateFromChat(CreateRecommendationRequest request) {
        RecommendationOptionsResponse options = generate(request);
        List<RecommendationResponse> recommendations = options.getOptions().stream()
                .map(opt -> getById(opt.getRecommendationId()))
                .toList();
        return new ChatGenerationResult(options, recommendations);
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
            Product anchor,
            UUID selectedProductId) {

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
                body, style, request, wardrobe, eligible, selectedProductId);
        if (stylistOutcome.result().isPresent()) {
            GeminiStylistResult gemini = stylistOutcome.result().get();
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
        }

        if (items == null) {
            if (stylistOutcome.fallbackReason() != null) {
                log.info("Stylist fallback to rule engine: reason={} style={} candidateCount={}",
                        stylistOutcome.fallbackReason(), styleLabel, eligible.size());
            }
            items = outfitCompositionService.buildOutfit(
                    anchor, eligible, wardrobe, mode, body, style);
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
        return productRepository.findByStatus(ProductStatus.ACTIVE).stream()
                .filter(eligibilityService::canBeRecommended)
                .limit(6)
                .map(p -> RecommendationResponse.OutfitItemDto.builder()
                        .productId(p.getId())
                        .role(outfitCompositionService.guessRole(p.getCategory()))
                        .sourceType(SourceType.BRAND_PRODUCT)
                        .displayName(p.getName())
                        .price(p.getPrice())
                        .canBuy(eligibilityService.canShowBuyButton(p))
                        .imageUrl(outfitCompositionService.resolveProductImageUrl(p.getId()))
                        .build())
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
