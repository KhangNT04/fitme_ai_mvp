package com.fitme.analytics.repository;

import com.fitme.analytics.entity.AnalyticsEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, UUID> {

    List<AnalyticsEvent> findByEventType(String eventType);

    List<AnalyticsEvent> findByBrandId(UUID brandId);

    List<AnalyticsEvent> findByUserId(UUID userId);

    List<AnalyticsEvent> findBySessionId(UUID sessionId);

    List<AnalyticsEvent> findByBrandIdAndEventType(UUID brandId, String eventType);

    List<AnalyticsEvent> findByBrandIdAndProductId(UUID brandId, UUID productId);
}
