package com.fitme.analytics;

import com.fitme.AbstractIntegrationTest;
import com.fitme.analytics.dto.BrandAnalyticsResponse;
import com.fitme.analytics.dto.BrandDashboardResponse;
import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductViewAndBrandStatsIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AnalyticsService analyticsService;
    @Autowired
    private TestDataHelper testData;
    @Autowired
    private ProductRepository products;
    @Autowired
    private JdbcTemplate jdbc;

    private record Fixture(TestDataHelper.BrandOwnerContext owner, Product product) {}

    private Fixture productFixture() {
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        Product product = testData.createDraftProductForBrand(owner.brand(), "Sản phẩm " + UUID.randomUUID());
        product.setStatus(ProductStatus.ACTIVE);
        return new Fixture(owner, products.save(product));
    }

    @Test
    void productViews_areDedupedPerViewer_andFeedBrandCtr() throws Exception {
        Fixture fixture = productFixture();
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
        Fixture first = productFixture();
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
    void productAnalytics_breaksDownOccasionSizeAndColorFromTryOns() {
        Fixture fixture = productFixture();
        UUID productId = fixture.product().getId();
        UUID brandId = fixture.owner().brand().getId();
        for (String[] row : new String[][] {{"Đi làm", "M", "Đen"}, {"Đi làm", "M", "Trắng"}, {"Hẹn hò", "L", "Đen"}}) {
            UUID requestId = tryOnRequest("COMPLETED");
            jdbc.update("UPDATE try_on_requests SET occasion=? WHERE id=?", row[0], requestId);
            jdbc.update("INSERT INTO try_on_items (try_on_request_id, product_id, role, selected_size, selected_color) "
                    + "VALUES (?, ?, 'TOP', ?, ?)", requestId, productId, row[1], row[2]);
        }

        var analytics = analyticsService.productAnalytics(brandId, productId);
        assertThat(analytics.getTopOccasions()).first()
                .satisfies(p -> assertThat(p.getName()).isEqualTo("Đi làm"))
                .satisfies(p -> assertThat(p.getValue()).isEqualTo(2));
        assertThat(analytics.getTopSizes()).extracting("name").containsExactly("M", "L");
        assertThat(analytics.getTopColors()).first()
                .satisfies(p -> assertThat(p.getName()).isEqualTo("Đen"));
    }

    @Test
    void productAnalytics_ofAnotherBrandsProduct_isNotFound() throws Exception {
        Fixture fixture = productFixture();
        UUID completed = tryOnRequest("COMPLETED");
        tryOnItem(completed, fixture.product().getId(), "TOP");
        FitMeUserPrincipal otherBrand = new FitMeUserPrincipal(testData.createBrandOwner().user());
        FitMeUserPrincipal owner = new FitMeUserPrincipal(fixture.owner().user());

        mockMvc.perform(get("/api/v1/brand/products/{id}/analytics", fixture.product().getId()).with(user(otherBrand)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/brand/products/{id}/analytics", fixture.product().getId()).with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tryOns").value(1));
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
