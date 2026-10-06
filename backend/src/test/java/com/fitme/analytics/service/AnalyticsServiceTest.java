package com.fitme.analytics.service;

import com.fitme.AbstractIntegrationTest;
import com.fitme.analytics.dto.AdminDashboardResponse;
import com.fitme.analytics.dto.BrandDashboardResponse;
import com.fitme.auth.entity.UserAccount;
import com.fitme.brand.entity.Brand;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AnalyticsServiceTest extends AbstractIntegrationTest {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    /** BR-ANA-07: the dashboard is aggregate-only; customer details exist only on /brand/leads for Brand Plus. */
    @Test
    void brandDashboard_aggregatesEventsWithoutPii() throws Exception {
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
        assertThat(dashboard.getTryOnAttempts()).isZero();
        assertThat(dashboard.getAiRecommendedProducts()).isEqualTo(1);

        Product product = testDataHelper.createEligibleProductForBrand(brand, "PII check top", "Áo thun");
        UserAccount customer = testDataHelper.createUser().user();
        FitMeUserPrincipal principal = new FitMeUserPrincipal(customer);
        grantLeadSharing(principal);
        buyClick(principal, product);
        analyticsService.track("TRY_ON_GENERATED", customer.getId(), null, brandId, product.getId(), null, null,
                Map.of("brandIds", List.of(brandId.toString()), "productIds", List.of(product.getId().toString())));

        FitMeUserPrincipal owner = new FitMeUserPrincipal(ctx.user());
        String dashboardJson = mockMvc.perform(get("/api/v1/brand/dashboard").with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tryOnCustomers30d").value(1))
                .andReturn().getResponse().getContentAsString();
        assertThat(dashboardJson)
                .doesNotContain(customer.getEmail())
                .doesNotContain(customer.getDisplayName())
                .doesNotContain(customer.getId().toString())
                .doesNotContainIgnoringCase("email");

        String freeLeads = mockMvc.perform(get("/api/v1/brand/leads").with(user(owner)))
                .andExpect(jsonPath("$.data.plusRequired").value(true))
                .andReturn().getResponse().getContentAsString();
        assertThat(freeLeads).doesNotContain(customer.getEmail());

        jdbc.update("INSERT INTO brand_subscriptions (brand_id, plan_id, status, starts_at, ends_at) "
                        + "VALUES (?, (SELECT id FROM billing_plans WHERE code = 'BRAND_PLUS'), 'ACTIVE', ?, ?)",
                brandId, Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)),
                Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS)));
        mockMvc.perform(get("/api/v1/brand/leads").with(user(owner)))
                .andExpect(jsonPath("$.data.items[0].customerEmail").value(customer.getEmail()));
        assertThat(mockMvc.perform(get("/api/v1/brand/dashboard").with(user(owner)))
                .andReturn().getResponse().getContentAsString()).doesNotContain(customer.getEmail());
    }

    @Test
    void brandDashboard_countsDistinctTryOnCustomersAndTheFunnel() throws Exception {
        TestDataHelper.BrandOwnerContext ctx = testDataHelper.createBrandOwner();
        Brand brand = ctx.brand();
        UUID brandId = brand.getId();
        Product top = testDataHelper.createEligibleProductForBrand(brand, "Áo customer metrics", "Áo thun");
        Product pants = testDataHelper.createEligibleProductForBrand(brand, "Quần customer metrics", "Quần");
        Brand otherBrand = testDataHelper.createApprovedBrand();
        Product otherProduct = testDataHelper.createEligibleProductForBrand(otherBrand, "Other brand top", "Áo thun");

        UserAccount repeat = testDataHelper.createUser().user();
        tryOn(repeat.getId(), brand, top);
        tryOn(repeat.getId(), brand, pants);
        UserAccount tenDaysAgo = testDataHelper.createUser().user();
        tryOn(tenDaysAgo.getId(), brand, top);
        backdateEvents(tenDaysAgo.getId(), 10);
        UserAccount longAgo = testDataHelper.createUser().user();
        tryOn(longAgo.getId(), brand, top);
        backdateEvents(longAgo.getId(), 40);
        UserAccount mixedOutfit = testDataHelper.createUser().user();
        analyticsService.track("TRY_ON_GENERATED", mixedOutfit.getId(), null, null, null, null, null,
                Map.of("brandIds", List.of(brandId.toString(), otherBrand.getId().toString()),
                        "productIds", List.of(pants.getId().toString(), otherProduct.getId().toString())));
        tryOn(testDataHelper.createUser().user().getId(), otherBrand, otherProduct);

        String anonymous = createAnonymousSessionToken();
        UUID anonymousSessionId = jdbc.queryForObject("SELECT id FROM anonymous_sessions WHERE session_token = ?",
                UUID.class, anonymous);
        String tryOnId = objectMapper.readTree(mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, anonymous)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"previewMode\":\"OUTFIT_BOARD_ONLY\",\"heightCm\":165,\"weightKg\":55}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", tryOnId)
                        .header(SESSION_HEADER, anonymous)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"%s\",\"role\":\"%s\",\"selectedSize\":\"M\"}"
                                .formatted(top.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", tryOnId).header(SESSION_HEADER, anonymous))
                .andExpect(status().isOk());
        Map<String, Object> generated = jdbc.queryForMap("SELECT session_id, brand_id, product_id, "
                + "metadata ->> 'brandIds' AS brand_ids FROM analytics_events "
                + "WHERE event_type = 'TRY_ON_GENERATED' AND try_on_request_id = ?::uuid", tryOnId);
        assertThat(generated)
                .containsEntry("session_id", anonymousSessionId)
                .containsEntry("brand_id", brandId)
                .containsEntry("product_id", top.getId());
        assertThat((String) generated.get("brand_ids")).contains(brandId.toString());

        FitMeUserPrincipal buyer = new FitMeUserPrincipal(repeat);
        grantLeadSharing(buyer);
        buyClick(buyer, top);
        buyClick(buyer, pants);
        mockMvc.perform(post("/api/v1/redirects/buy-click")
                        .header(SESSION_HEADER, anonymous)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"%s\",\"sourcePage\":\"try-on\"}".formatted(top.getId())))
                .andExpect(status().isOk());
        FitMeUserPrincipal oldBuyer = new FitMeUserPrincipal(longAgo);
        buyClick(oldBuyer, top);
        jdbc.update("UPDATE buy_click_events SET created_at = created_at - INTERVAL '40 days' WHERE user_id = ?",
                longAgo.getId());
        jdbc.update("UPDATE brand_leads SET confirmed_sold_at = NOW() WHERE user_id = ? AND product_id = ?",
                repeat.getId(), top.getId());

        mockMvc.perform(get("/api/v1/brand/dashboard").with(user(new FitMeUserPrincipal(ctx.user()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tryOnCustomers7d").value(3))
                .andExpect(jsonPath("$.data.tryOnCustomers30d").value(4))
                .andExpect(jsonPath("$.data.topTryOnProducts", hasSize(2)))
                .andExpect(jsonPath("$.data.topTryOnProducts[0].productId").value(top.getId().toString()))
                .andExpect(jsonPath("$.data.topTryOnProducts[0].productName").value(top.getName()))
                .andExpect(jsonPath("$.data.topTryOnProducts[0].customers").value(3))
                .andExpect(jsonPath("$.data.topTryOnProducts[1].productId").value(pants.getId().toString()))
                .andExpect(jsonPath("$.data.topTryOnProducts[1].customers").value(2))
                .andExpect(jsonPath("$.data.funnel30d.tryOnCustomers").value(4))
                .andExpect(jsonPath("$.data.funnel30d.buyClickCustomers").value(2))
                .andExpect(jsonPath("$.data.funnel30d.soldLeads").value(1));
    }

    @Test
    void brandDashboard_clickThroughRateNeverExceedsOneHundredPercent() {
        UUID brandId = testDataHelper.createBrandOwner().brand().getId();
        analyticsService.track("PRODUCT_VIEWED", null, null, brandId, null, null, null, null);
        for (int i = 0; i < 3; i++) {
            analyticsService.track("BUY_CLICKED", null, null, brandId, null, null, null, null);
        }

        BrandDashboardResponse dashboard = analyticsService.brandDashboard(brandId);

        assertThat(dashboard.getBuyClicks()).isEqualTo(3);
        assertThat(dashboard.getClickThroughRate()).isEqualTo(1.0);
        assertThat(AnalyticsService.rate(1, 4)).isEqualTo(0.25);
        assertThat(AnalyticsService.rate(5, 0)).isZero();
    }

    @Test
    void adminDashboard_returnsAggregateCountsOnly() {
        analyticsService.track("RECOMMENDATION_GENERATED", null, null,
                null, null, null, null, null);

        AdminDashboardResponse dashboard = analyticsService.adminDashboard();

        assertThat(dashboard.getTotalRecommendations()).isGreaterThanOrEqualTo(1);
        assertThat(dashboard.getTotalBrands()).isGreaterThanOrEqualTo(0);
    }

    private void tryOn(UUID userId, Brand brand, Product product) {
        analyticsService.track("TRY_ON_GENERATED", userId, null, brand.getId(), product.getId(), null, null,
                Map.of("brandIds", List.of(brand.getId().toString()), "productIds", List.of(product.getId().toString())));
    }

    private void backdateEvents(UUID userId, int days) {
        jdbc.update("UPDATE analytics_events SET created_at = created_at - make_interval(days => ?) WHERE user_id = ?",
                days, userId);
    }

    private void grantLeadSharing(FitMeUserPrincipal principal) throws Exception {
        mockMvc.perform(post("/api/v1/privacy/consent")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"consentType\":\"BRAND_LEAD_SHARING\",\"accepted\":true}"))
                .andExpect(status().isOk());
    }

    private void buyClick(FitMeUserPrincipal principal, Product product) throws Exception {
        mockMvc.perform(post("/api/v1/redirects/buy-click")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"%s\",\"sourcePage\":\"product-detail\"}".formatted(product.getId())))
                .andExpect(status().isOk());
    }
}
