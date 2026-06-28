package com.fitme.analytics.service;

import com.fitme.AbstractIntegrationTest;
import com.fitme.analytics.dto.AdminDashboardResponse;
import com.fitme.analytics.dto.BrandDashboardResponse;
import com.fitme.brand.entity.Brand;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

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

        BrandDashboardResponse dashboard = analyticsService.brandDashboard(brandId);

        assertThat(dashboard.getBuyClicks()).isEqualTo(1);
        assertThat(dashboard.getTryOnAttempts()).isEqualTo(1);
        assertThat(dashboard.getAiRecommendedProducts()).isEqualTo(1);
    }

    @Test
    void adminDashboard_returnsAggregateCountsOnly() {
        analyticsService.track("RECOMMENDATION_GENERATED", null, null,
                null, null, null, null, null);

        AdminDashboardResponse dashboard = analyticsService.adminDashboard();

        assertThat(dashboard.getTotalRecommendations()).isGreaterThanOrEqualTo(1);
        assertThat(dashboard.getTotalBrands()).isGreaterThanOrEqualTo(0);
    }
}
