package com.fitme.analytics.service;

import com.fitme.analytics.dto.AdminDashboardResponse;
import com.fitme.analytics.dto.BrandAnalyticsResponse;
import com.fitme.analytics.dto.BrandDashboardResponse;
import com.fitme.analytics.dto.ChartDataPoint;
import com.fitme.analytics.dto.ProductAnalyticsResponse;
import com.fitme.analytics.entity.AnalyticsEvent;
import com.fitme.analytics.repository.AnalyticsEventRepository;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.FlaggedLinkStatus;
import com.fitme.common.enums.ProductStatus;
import com.fitme.product.repository.ProductRepository;
import com.fitme.redirect.repository.FlaggedLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsEventRepository eventRepository;
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;
    private final UserAccountRepository userAccountRepository;
    private final FlaggedLinkRepository flaggedLinkRepository;

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

    public BrandDashboardResponse brandDashboard(UUID brandId) {
        List<AnalyticsEvent> events = eventRepository.findByBrandId(brandId);
        long totalProducts = productRepository.findByBrandId(brandId).size();
        long activeProducts = productRepository.findByBrandIdAndStatus(brandId, ProductStatus.ACTIVE).size();
        long buyClicks = count(events, "BUY_CLICKED");
        long recommendations = count(events, "RECOMMENDATION_GENERATED");
        long tryOnStarted = count(events, "TRY_ON_STARTED");
        long views = count(events, "PRODUCT_VIEWED");
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
                        point("Started", count(events, "TRY_ON_STARTED")),
                        point("Generated", count(events, "TRY_ON_GENERATED"))))
                .topOccasions(topMetadata(events, "occasion"))
                .topStyles(topMetadata(events, "style"))
                .topColors(topMetadata(events, "color"))
                .topSizes(topMetadata(events, "size"))
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
                .views(count(events, "PRODUCT_VIEWED"))
                .buyClicks(count(events, "BUY_CLICKED"))
                .tryOns(count(events, "TRY_ON_STARTED"))
                .redirectClicks(chartByEventType(events, "BUY_CLICKED"))
                .build();
    }

    public AdminDashboardResponse adminDashboard() {
        List<AnalyticsEvent> all = eventRepository.findAll();
        return AdminDashboardResponse.builder()
                .totalBrands(brandRepository.count())
                .pendingBrands(brandRepository.findByStatus(BrandStatus.PENDING).size())
                .totalProducts(productRepository.count())
                .pendingProducts(productRepository.findByStatus(ProductStatus.PENDING_REVIEW).size())
                .flaggedLinks(flaggedLinkRepository.findByStatus(FlaggedLinkStatus.OPEN).size())
                .activeUsers(userAccountRepository.count())
                .totalRecommendations(count(all, "RECOMMENDATION_GENERATED"))
                .totalTryOns(count(all, "TRY_ON_STARTED"))
                .build();
    }

    public Map<String, Object> tryOnMonitoring() {
        return Map.of(
                "tryOnStarted", count(eventRepository.findByEventType("TRY_ON_STARTED"), "TRY_ON_STARTED"),
                "tryOnGenerated", count(eventRepository.findByEventType("TRY_ON_GENERATED"), "TRY_ON_GENERATED"));
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
