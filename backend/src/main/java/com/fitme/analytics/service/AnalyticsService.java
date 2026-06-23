package com.fitme.analytics.service;

import com.fitme.analytics.entity.AnalyticsEvent;
import com.fitme.analytics.repository.AnalyticsEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsEventRepository eventRepository;

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

    public Map<String, Object> brandDashboard(UUID brandId) {
        List<AnalyticsEvent> events = eventRepository.findByBrandId(brandId);
        return Map.of(
                "totalEvents", events.size(),
                "buyClicks", count(events, "BUY_CLICKED"),
                "tryOns", count(events, "TRY_ON_STARTED"),
                "recommendations", count(events, "RECOMMENDATION_GENERATED")
        );
    }

    public Map<String, Object> brandRedirectAnalytics(UUID brandId) {
        return Map.of("buyClicks", count(eventRepository.findByBrandIdAndEventType(brandId, "BUY_CLICKED"), "BUY_CLICKED"));
    }

    public Map<String, Object> brandDropoff(UUID brandId) {
        long clicks = count(eventRepository.findByBrandId(brandId), "BUY_CLICKED");
        long fails = count(eventRepository.findByBrandId(brandId), "REDIRECT_FAILED");
        return Map.of("buyClicks", clicks, "redirectFailed", fails,
                "dropoffRate", clicks + fails > 0 ? (double) fails / (clicks + fails) : 0);
    }

    public Map<String, Object> brandHesitation(UUID brandId) {
        return Map.of("variantComparisons",
                count(eventRepository.findByBrandId(brandId), "SIZE_COMPARED")
                        + count(eventRepository.findByBrandId(brandId), "COLOR_COMPARED"));
    }

    public Map<String, Object> brandTryOnAnalytics(UUID brandId) {
        return Map.of("tryOnStarted", count(eventRepository.findByBrandId(brandId), "TRY_ON_STARTED"),
                "tryOnGenerated", count(eventRepository.findByBrandId(brandId), "TRY_ON_GENERATED"));
    }

    public Map<String, Object> productAnalytics(UUID brandId, UUID productId) {
        List<AnalyticsEvent> events = eventRepository.findByBrandIdAndProductId(brandId, productId);
        return Map.of("views", count(events, "PRODUCT_VIEWED"),
                "buyClicks", count(events, "BUY_CLICKED"),
                "tryOns", count(events, "TRY_ON_STARTED"));
    }

    public Map<String, Object> adminDashboard() {
        List<AnalyticsEvent> all = eventRepository.findAll();
        return Map.of(
                "totalEvents", all.size(),
                "recommendations", count(all, "RECOMMENDATION_GENERATED"),
                "buyClicks", count(all, "BUY_CLICKED"),
                "tryOns", count(all, "TRY_ON_STARTED"),
                "feedback", count(all, "FEEDBACK_SUBMITTED")
        );
    }

    public Map<String, Object> tryOnMonitoring() {
        return Map.of("tryOnStarted", count(eventRepository.findByEventType("TRY_ON_STARTED"), "TRY_ON_STARTED"),
                "tryOnGenerated", count(eventRepository.findByEventType("TRY_ON_GENERATED"), "TRY_ON_GENERATED"));
    }

    private long count(List<AnalyticsEvent> events, String type) {
        return events.stream().filter(e -> type.equals(e.getEventType())).count();
    }
}
