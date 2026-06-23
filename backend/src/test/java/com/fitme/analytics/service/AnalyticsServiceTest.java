package com.fitme.analytics.service;

import com.fitme.AbstractIntegrationTest;
import com.fitme.brand.entity.Brand;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsServiceTest extends AbstractIntegrationTest {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void brandDashboard_aggregatesEventsWithoutPii() {
        TestDataHelper.BrandOwnerContext ctx = testDataHelper.createBrandOwner();
        Brand brand = ctx.brand();
        UUID brandId = brand.getId();

        analyticsService.track("BUY_CLICKED", null, null, brandId,
                null, null, null, null);
        analyticsService.track("TRY_ON_STARTED", null, null, brandId,
                null, null, null, null);
        analyticsService.track("RECOMMENDATION_GENERATED", null, null, brandId,
                null, null, null, null);

        Map<String, Object> dashboard = analyticsService.brandDashboard(brandId);

        assertThat(dashboard).containsKeys("totalEvents", "buyClicks", "tryOns", "recommendations");
        assertThat(dashboard.get("totalEvents")).isEqualTo(3);
        assertThat(dashboard.get("buyClicks")).isEqualTo(1L);
        assertThat(dashboard).doesNotContainKeys("email", "phone", "photoUrl", "bodyProfile");
        assertThat(dashboard.values()).noneMatch(v -> v != null && v.toString().contains("@"));
    }

    @Test
    void adminDashboard_returnsAggregateCountsOnly() {
        analyticsService.track("RECOMMENDATION_GENERATED", null, null,
                null, null, null, null, null);
        analyticsService.track("FEEDBACK_SUBMITTED", null, null,
                null, null, null, null, null);

        Map<String, Object> dashboard = analyticsService.adminDashboard();

        assertThat(dashboard).containsKeys("totalEvents", "recommendations", "buyClicks", "tryOns", "feedback");
        assertThat(dashboard).doesNotContainKeys("userId", "sessionToken", "displayName");
    }
}
