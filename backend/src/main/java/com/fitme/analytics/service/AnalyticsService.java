package com.fitme.analytics.service;

import com.fitme.analytics.dto.AdminDashboardResponse;
import com.fitme.analytics.dto.BrandAnalyticsResponse;
import com.fitme.analytics.dto.BrandDashboardResponse;
import com.fitme.analytics.dto.BrandDemandInsightResponse;
import com.fitme.analytics.dto.ChartDataPoint;
import com.fitme.analytics.dto.ProductAnalyticsResponse;
import com.fitme.analytics.entity.AnalyticsEvent;
import com.fitme.analytics.repository.AnalyticsEventRepository;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.FlaggedLinkStatus;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.redirect.entity.BuyClickEvent;
import com.fitme.redirect.repository.BuyClickEventRepository;
import com.fitme.redirect.repository.FlaggedLinkRepository;
import com.fitme.common.security.RequestContext;
import com.fitme.common.time.AppClock;
import com.fitme.tryon.repository.TryOnItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    public static final String PRODUCT_VIEWED = "PRODUCT_VIEWED";
    static final Duration VIEW_DEDUP_WINDOW = Duration.ofMinutes(30);

    private final AnalyticsEventRepository eventRepository;
    private final TryOnItemRepository tryOnItemRepository;
    private final AppClock clock;
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final FlaggedLinkRepository flaggedLinkRepository;
    private final AdminMetricsService adminMetricsService;
    private final BuyClickEventRepository buyClickEventRepository;

    public void track(String eventType, UUID userId, UUID sessionId, UUID brandId,
                      UUID productId, UUID recommendationId, UUID tryOnRequestId,
                      Map<String, Object> metadata) {
        eventRepository.save(AnalyticsEvent.builder()
                .eventType(eventType)
                .userId(userId)
                .sessionId(sessionId)
                .brandId(brandId)
                .productId(productId)
                .recommendationId(recommendationId)
                .tryOnRequestId(tryOnRequestId)
                .metadata(metadata)
                .build());
    }

    /**
     * Records a product detail view. Repeat views of the same product by the same user or anonymous session
     * within {@link #VIEW_DEDUP_WINDOW} count once.
     */
    @Transactional
    public void recordProductView(UUID productId) {
        Product product = productRepository.findById(productId)
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                .orElse(null);
        if (product == null) {
            return;
        }
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = userId == null ? RequestContext.getSessionId().orElse(null) : null;
        Instant since = clock.now().minus(VIEW_DEDUP_WINDOW);
        boolean duplicate = userId != null
                ? eventRepository.existsByEventTypeAndProductIdAndUserIdAndCreatedAtAfter(
                        PRODUCT_VIEWED, productId, userId, since)
                : sessionId != null && eventRepository.existsByEventTypeAndProductIdAndSessionIdAndCreatedAtAfter(
                        PRODUCT_VIEWED, productId, sessionId, since);
        if (!duplicate) {
            track(PRODUCT_VIEWED, userId, sessionId, product.getBrandId(), productId, null, null, null);
        }
    }

    public BrandDashboardResponse brandDashboard(UUID brandId) {
        List<AnalyticsEvent> events = eventRepository.findByBrandId(brandId);
        long totalProducts = productRepository.findByBrandId(brandId).size();
        long activeProducts = productRepository.findByBrandIdAndStatus(brandId, ProductStatus.ACTIVE).size();
        long buyClicks = count(events, "BUY_CLICKED");
        long recommendations = count(events, "RECOMMENDATION_GENERATED");
        long tryOnStarted = tryOnItemRepository.countBrandTryOns(brandId, false);
        long views = count(events, PRODUCT_VIEWED);
        double ctr = views > 0 ? (double) buyClicks / views : 0;
        double tryOnToBuy = tryOnStarted > 0 ? (double) buyClicks / tryOnStarted : 0;
        return BrandDashboardResponse.builder()
                .totalProducts(totalProducts)
                .activeProducts(activeProducts)
                .aiRecommendedProducts(recommendations)
                .buyClicks(buyClicks)
                .clickThroughRate(ctr)
                .tryOnAttempts(tryOnStarted)
                .tryOnToBuyRate(tryOnToBuy)
                .build();
    }

    public BrandAnalyticsResponse brandAnalytics(UUID brandId) {
        List<AnalyticsEvent> events = eventRepository.findByBrandId(brandId);
        return BrandAnalyticsResponse.builder()
                .redirectClicks(chartByEventType(events, "BUY_CLICKED"))
                .dropoffPoints(List.of(
                        point("Buy clicks", count(events, "BUY_CLICKED")),
                        point("Redirect failed", count(events, "REDIRECT_FAILED"))))
                .hesitationItems(List.of(
                        point("Size compared", count(events, "SIZE_COMPARED")),
                        point("Color compared", count(events, "COLOR_COMPARED"))))
                .tryOnStats(List.of(
                        point("Started", tryOnItemRepository.countBrandTryOns(brandId, false)),
                        point("Generated", tryOnItemRepository.countBrandTryOns(brandId, true))))
                .topOccasions(topMetadata(events, "occasion"))
                .topStyles(topMetadata(events, "style"))
                .topColors(topMetadata(events, "color"))
                .topSizes(topMetadata(events, "size"))
                .build();
    }

    public BrandDemandInsightResponse brandDemandInsights(UUID brandId) {
        List<AnalyticsEvent> events = eventRepository.findByBrandId(brandId);
        long likes = count(events, "OUTFIT_LIKED");
        long dislikes = count(events, "OUTFIT_DISLIKED");
        long buyClicks = count(events, "BUY_CLICKED");

        Map<UUID, Product> productsById = productRepository.findByBrandId(brandId).stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));
        Set<UUID> productIds = productsById.keySet();

        long purchasedConfirmed = 0;
        Map<UUID, Long> clickByProduct = new HashMap<>();
        for (UUID productId : productIds) {
            List<BuyClickEvent> clicks = buyClickEventRepository.findByProductId(productId);
            clickByProduct.put(productId, (long) clicks.size());
            purchasedConfirmed += clicks.stream().filter(BuyClickEvent::isPurchasedConfirmed).count();
        }

        List<BrandDemandInsightResponse.InsightItem> topClicked = clickByProduct.entrySet().stream()
                .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> BrandDemandInsightResponse.InsightItem.builder()
                        .label(productsById.get(e.getKey()) != null
                                ? productsById.get(e.getKey()).getName()
                                : e.getKey().toString())
                        .count(e.getValue())
                        .build())
                .toList();

        Map<UUID, Long> likeByProduct = new HashMap<>();
        for (AnalyticsEvent e : events) {
            if (!"OUTFIT_LIKED".equals(e.getEventType()) || e.getProductId() == null) continue;
            likeByProduct.merge(e.getProductId(), 1L, Long::sum);
        }
        List<BrandDemandInsightResponse.InsightItem> topLiked = likeByProduct.entrySet().stream()
                .sorted(Map.Entry.<UUID, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> BrandDemandInsightResponse.InsightItem.builder()
                        .label(productsById.containsKey(e.getKey())
                                ? productsById.get(e.getKey()).getName()
                                : "Sản phẩm")
                        .count(e.getValue())
                        .build())
                .toList();

        String summary = "Gen Z đang " + (likes >= dislikes ? "thích" : "phản hồi trung bình về")
                + " look của brand (" + likes + " like / " + dislikes + " dislike). "
                + buyClicks + " lượt click mua; " + purchasedConfirmed + " xác nhận đã mua.";

        return BrandDemandInsightResponse.builder()
                .outfitLikes(likes)
                .outfitDislikes(dislikes)
                .buyClicks(buyClicks)
                .purchasedConfirmed(purchasedConfirmed)
                .topClickedProducts(topClicked.isEmpty()
                        ? List.of(BrandDemandInsightResponse.InsightItem.builder()
                        .label("Chưa có dữ liệu").count(0).build())
                        : topClicked)
                .topLikedSignals(topLiked.isEmpty()
                        ? List.of(BrandDemandInsightResponse.InsightItem.builder()
                        .label("Chưa có dữ liệu").count(0).build())
                        : topLiked)
                .summaryVi(summary)
                .build();
    }

    public BrandAnalyticsResponse brandRedirectAnalytics(UUID brandId) {
        return brandAnalytics(brandId);
    }

    public BrandAnalyticsResponse brandDropoff(UUID brandId) {
        return brandAnalytics(brandId);
    }

    public BrandAnalyticsResponse brandHesitation(UUID brandId) {
        return brandAnalytics(brandId);
    }

    public BrandAnalyticsResponse brandTryOnAnalytics(UUID brandId) {
        return brandAnalytics(brandId);
    }

    public ProductAnalyticsResponse productAnalytics(UUID brandId, UUID productId) {
        List<AnalyticsEvent> events = eventRepository.findByBrandIdAndProductId(brandId, productId);
        return ProductAnalyticsResponse.builder()
                .views(count(events, PRODUCT_VIEWED))
                .buyClicks(count(events, "BUY_CLICKED"))
                .tryOns(tryOnItemRepository.countProductTryOns(productId, false))
                .redirectClicks(chartByEventType(events, "BUY_CLICKED"))
                .build();
    }

    public AdminDashboardResponse adminDashboard() {
        return AdminDashboardResponse.builder()
                .totalBrands(brandRepository.count())
                .pendingBrands(brandRepository.countByStatus(BrandStatus.PENDING))
                .totalProducts(productRepository.count())
                .pendingProducts(productRepository.countByStatus(ProductStatus.PENDING_REVIEW))
                .flaggedLinks(flaggedLinkRepository.countByStatus(FlaggedLinkStatus.OPEN))
                .totalUsers(adminMetricsService.totalConsumers())
                .activeUsers(adminMetricsService.activeUsersSince(30))
                .totalRecommendations(eventRepository.countByEventType("RECOMMENDATION_GENERATED"))
                .totalTryOns(eventRepository.countByEventType("TRY_ON_STARTED"))
                .build();
    }

    public Map<String, Object> tryOnMonitoring() {
        return Map.of(
                "tryOnStarted", eventRepository.countByEventType("TRY_ON_STARTED"),
                "tryOnGenerated", eventRepository.countByEventType("TRY_ON_GENERATED"));
    }

    private List<ChartDataPoint> chartByEventType(List<AnalyticsEvent> events, String type) {
        long value = count(events, type);
        if (value == 0) {
            return List.of(point("No data", 0));
        }
        return List.of(point(type, value));
    }

    private List<ChartDataPoint> topMetadata(List<AnalyticsEvent> events, String key) {
        Map<String, Long> counts = new HashMap<>();
        for (AnalyticsEvent e : events) {
            if (e.getMetadata() == null) continue;
            Object val = e.getMetadata().get(key);
            if (val != null) {
                String name = val.toString();
                counts.merge(name, 1L, Long::sum);
            }
        }
        if (counts.isEmpty()) {
            return List.of(point("Chưa có dữ liệu", 0));
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> point(e.getKey(), e.getValue()))
                .toList();
    }

    private ChartDataPoint point(String name, long value) {
        return ChartDataPoint.builder().name(name).value(value).build();
    }

    private long count(List<AnalyticsEvent> events, String type) {
        return events.stream().filter(e -> type.equals(e.getEventType())).count();
    }
}
