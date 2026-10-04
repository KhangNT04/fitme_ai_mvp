package com.fitme.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.analytics.dto.BrandAnalyticsResponse;
import com.fitme.analytics.dto.BrandDashboardResponse;
import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.order.CommerceIntegrationSupport;
import com.fitme.product.entity.Product;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductViewAndBrandStatsIntegrationTest extends CommerceIntegrationSupport {

    @Autowired
    private AnalyticsService analyticsService;

    @Test
    void productViews_areDedupedPerViewer_andFeedBrandCtr() throws Exception {
        ProductFixture fixture = productFixture(3);
        UUID productId = fixture.product().getId();
        UUID brandId = fixture.owner().brand().getId();
        String session = createAnonymousSessionToken();
        String otherSession = createAnonymousSessionToken();
        String userToken = registerUserAccessToken();

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/products/{id}/view", productId).header(SESSION_HEADER, session))
                    .andExpect(status().isOk());
            mockMvc.perform(post("/api/v1/products/{id}/view", productId)
                            .header("Authorization", "Bearer " + userToken))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(post("/api/v1/products/{id}/view", productId).header(SESSION_HEADER, otherSession))
                .andExpect(status().isOk());

        assertThat(viewEvents(productId)).isEqualTo(3);
        Long brandOnEvents = jdbc.queryForObject(
                "SELECT count(*) FROM analytics_events WHERE event_type='PRODUCT_VIEWED' AND product_id=? AND brand_id=?",
                Long.class, productId, brandId);
        assertThat(brandOnEvents).isEqualTo(3);

        analyticsService.track("BUY_CLICKED", null, null, brandId, productId, null, null, null);
        BrandDashboardResponse dashboard = analyticsService.brandDashboard(brandId);
        assertThat(dashboard.getBuyClicks()).isEqualTo(1);
        assertThat(dashboard.getClickThroughRate()).isEqualTo(1.0 / 3);
        assertThat(analyticsService.productAnalytics(brandId, productId).getViews()).isEqualTo(3);
    }

    @Test
    void productView_ignoresUnpublishedProducts() throws Exception {
        Product draft = testData.createDraftProductForBrand(testData.createBrandOwner().brand(),
                "Bản nháp " + UUID.randomUUID());
        assertThat(draft.getStatus()).isNotEqualTo(ProductStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/products/{id}/view", draft.getId())
                        .header(SESSION_HEADER, createAnonymousSessionToken()))
                .andExpect(status().isOk());

        assertThat(viewEvents(draft.getId())).isZero();
    }

    @Test
    void brandTryOnStats_countDistinctRequestsContainingBrandProducts() {
        ProductFixture first = productFixture(1);
        UUID brandId = first.owner().brand().getId();
        Product second = testData.createDraftProductForBrand(first.owner().brand(), "Quần " + UUID.randomUUID());

        UUID completed = tryOnRequest("COMPLETED");
        tryOnItem(completed, first.product().getId(), "TOP");
        tryOnItem(completed, second.getId(), "BOTTOM");
        tryOnItem(tryOnRequest("DRAFT"), first.product().getId(), "TOP");

        assertThat(analyticsService.brandDashboard(brandId).getTryOnAttempts()).isEqualTo(2);
        BrandAnalyticsResponse analytics = analyticsService.brandAnalytics(brandId);
        assertThat(analytics.getTryOnStats().get(0).getValue()).isEqualTo(2);
        assertThat(analytics.getTryOnStats().get(1).getValue()).isEqualTo(1);
        assertThat(analyticsService.productAnalytics(brandId, second.getId()).getTryOns()).isEqualTo(1);
    }

    @Test
    void adminOrderList_showsBuyer_butConsumerListDoesNot() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(2);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        String orderId = placeOrder(token, addressId, "COD", null).at("/order/id").asText();
        String email = jdbc.queryForObject("SELECT email FROM user_accounts WHERE id=?", String.class, userId(token));
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testData.createAdmin().user());

        String json = mockMvc.perform(get("/api/v1/admin/orders").with(user(admin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode row = null;
        for (JsonNode candidate : objectMapper.readTree(json).get("data")) {
            if (orderId.equals(candidate.get("id").asText())) {
                row = candidate;
            }
        }
        assertThat(row).isNotNull();
        assertThat(row.get("buyerEmail").asText()).isEqualTo(email);
        assertThat(row.get("buyerName").asText()).isEqualTo("Test Consumer");
        assertThat(row.get("buyerPhone").asText()).isEqualTo("0901234567");

        mockMvc.perform(get("/api/v1/orders").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(orderId))
                .andExpect(jsonPath("$.data[0].buyerEmail").doesNotExist())
                .andExpect(jsonPath("$.data[0].buyerName").doesNotExist());
    }

    private long viewEvents(UUID productId) {
        return jdbc.queryForObject(
                "SELECT count(*) FROM analytics_events WHERE event_type='PRODUCT_VIEWED' AND product_id=?",
                Long.class, productId);
    }

    private UUID tryOnRequest(String status) {
        return jdbc.queryForObject("INSERT INTO try_on_requests (status) VALUES (?) RETURNING id", UUID.class, status);
    }

    private void tryOnItem(UUID requestId, UUID productId, String role) {
        jdbc.update("INSERT INTO try_on_items (try_on_request_id, product_id, role) VALUES (?, ?, ?)",
                requestId, productId, role);
    }
}
