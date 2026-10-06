package com.fitme.brandplus;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Brand Plus with mock PayOS: pricing, checkout, return-page confirmation, admin plan editing and expiry. */
class BrandPlusIntegrationTest extends AbstractIntegrationTest {

    private static final long LIST_PRICE = 999_000;

    @Autowired
    private TestDataHelper testData;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private BrandPlusService brandPlusService;

    @AfterEach
    void restoreBrandPlusPlan() {
        jdbc.update("UPDATE billing_plans SET price_vnd = ?, active = TRUE, billing_period_days = 30, "
                + "discount_percent = NULL, discount_starts_at = NULL, discount_ends_at = NULL "
                + "WHERE code = 'BRAND_PLUS'", LIST_PRICE);
    }

    @Test
    void statusShowsListPriceWithoutDiscountAndEffectivePriceInsideWindow() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        mockMvc.perform(get("/api/v1/brand/plan").with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.status").doesNotExist())
                .andExpect(jsonPath("$.data.planAvailable").value(true))
                .andExpect(jsonPath("$.data.planCode").value("BRAND_PLUS"))
                .andExpect(jsonPath("$.data.planName").value("FitMe Brand Plus"))
                .andExpect(jsonPath("$.data.billingPeriodDays").value(30))
                .andExpect(jsonPath("$.data.listPriceVnd").value(LIST_PRICE))
                .andExpect(jsonPath("$.data.effectivePriceVnd").value(LIST_PRICE))
                .andExpect(jsonPath("$.data.discountActive").value(false))
                .andExpect(jsonPath("$.data.pendingOrder").doesNotExist());

        Instant now = Instant.now();
        setDiscount(20, now.plus(1, ChronoUnit.DAYS), now.plus(2, ChronoUnit.DAYS));
        mockMvc.perform(get("/api/v1/brand/plan").with(user(owner)))
                .andExpect(jsonPath("$.data.discountActive").value(false))
                .andExpect(jsonPath("$.data.effectivePriceVnd").value(LIST_PRICE))
                .andExpect(jsonPath("$.data.discountPercent").doesNotExist());

        setDiscount(20, now.minus(1, ChronoUnit.HOURS), now.plus(1, ChronoUnit.HOURS));
        mockMvc.perform(get("/api/v1/brand/plan").with(user(owner)))
                .andExpect(jsonPath("$.data.discountActive").value(true))
                .andExpect(jsonPath("$.data.discountPercent").value(20))
                .andExpect(jsonPath("$.data.listPriceVnd").value(LIST_PRICE))
                .andExpect(jsonPath("$.data.effectivePriceVnd").value(799_200))
                .andExpect(jsonPath("$.data.discountEndsAt").isNotEmpty());

        setDiscount(15, null, null);
        mockMvc.perform(get("/api/v1/brand/plan").with(user(owner)))
                .andExpect(jsonPath("$.data.discountActive").value(true))
                .andExpect(jsonPath("$.data.effectivePriceVnd").value(849_150));
    }

    @Test
    void checkoutCreatesPendingDiscountedOrder_andMockReturnActivatesThirtyDays() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID brandId = brandIdOf(owner);
        Instant now = Instant.now();
        setDiscount(33, now.minus(1, ChronoUnit.HOURS), now.plus(1, ChronoUnit.HOURS));

        JsonNode checkout = data(mockMvc.perform(post("/api/v1/brand/plan/checkout").with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mock").value(true))
                .andExpect(jsonPath("$.data.listPriceVnd").value(LIST_PRICE))
                .andExpect(jsonPath("$.data.discountPercentApplied").value(33))
                .andExpect(jsonPath("$.data.amountVnd").value(669_330))
                .andExpect(jsonPath("$.data.checkoutUrl").value(containsString("/brand/plan/return"))));
        long orderCode = checkout.get("orderCode").asLong();
        assertThat(orderCode).isGreaterThanOrEqualTo(1_000_000_000_000L);
        assertThat(checkout.get("checkoutUrl").asText()).contains("orderCode=" + orderCode);

        assertThat(jdbc.queryForMap("SELECT status, list_price, discount_percent_applied, amount, created_by_user_id "
                + "FROM brand_billing_orders WHERE order_code = ?", orderCode))
                .containsEntry("status", "PENDING")
                .containsEntry("list_price", LIST_PRICE)
                .containsEntry("discount_percent_applied", 33)
                .containsEntry("amount", 669_330L)
                .containsEntry("created_by_user_id", owner.getUserId());
        mockMvc.perform(get("/api/v1/brand/plan").with(user(owner)))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.pendingOrder.orderCode").value(orderCode))
                .andExpect(jsonPath("$.data.pendingOrder.status").value("PENDING"));
        assertThat(brandPlusService.isPlusActive(brandId)).isFalse();

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(get("/api/v1/brand/plan/orders/{code}", orderCode).with(user(owner)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("PAID"))
                    .andExpect(jsonPath("$.data.amountVnd").value(669_330))
                    .andExpect(jsonPath("$.data.plusEndsAt").isNotEmpty());
        }

        assertThat(endsAt(brandId)).isCloseTo(Instant.now().plus(30, ChronoUnit.DAYS), within(2, ChronoUnit.MINUTES));
        assertThat(brandPlusService.isPlusActive(brandId)).isTrue();
        assertThat(brandPlusService.activePlusBrandIds()).contains(brandId);
        mockMvc.perform(get("/api/v1/brand/plan").with(user(owner)))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.endsAt").isNotEmpty())
                .andExpect(jsonPath("$.data.pendingOrder").doesNotExist());
    }

    @Test
    void cancelledReturnMarksPendingOrderCancelled() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        long orderCode = data(mockMvc.perform(post("/api/v1/brand/plan/checkout").with(user(owner)))
                .andExpect(status().isOk())).get("orderCode").asLong();

        mockMvc.perform(post("/api/v1/brand/plan/orders/{code}/cancel", orderCode).with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
        mockMvc.perform(get("/api/v1/brand/plan/orders/{code}", orderCode).with(user(owner)))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
        assertThat(brandPlusService.isPlusActive(brandIdOf(owner))).isFalse();
    }

    @Test
    void brandCannotReadOrCancelAnotherBrandsOrder() throws Exception {
        FitMeUserPrincipal ownerA = brandOwner();
        FitMeUserPrincipal ownerB = brandOwner();
        long orderCode = data(mockMvc.perform(post("/api/v1/brand/plan/checkout").with(user(ownerA)))
                .andExpect(status().isOk())).get("orderCode").asLong();

        mockMvc.perform(get("/api/v1/brand/plan/orders/{code}", orderCode).with(user(ownerB)))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/brand/plan/orders/{code}/cancel", orderCode).with(user(ownerB)))
                .andExpect(status().isNotFound());

        assertThat(jdbc.queryForObject("SELECT status FROM brand_billing_orders WHERE order_code = ?",
                String.class, orderCode)).isEqualTo("PENDING");
        assertThat(brandPlusService.isPlusActive(brandIdOf(ownerB))).isFalse();
    }

    @Test
    void onlyBrandOwnersReachTheBrandPlanApi() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testData.createUser().user());
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testData.createAdmin().user());

        mockMvc.perform(get("/api/v1/brand/plan").with(user(consumer))).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/brand/plan/checkout").with(user(consumer))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/brand/plan").with(user(admin))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/brand/plan")).andExpect(status().is4xxClientError());
    }

    @Test
    void consumerFlowsNeverOfferOrAcceptBrandPlus() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testData.createUser().user());

        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'BRAND_PLUS')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')].audience").value("CONSUMER"));

        mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .with(user(consumer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": \"%s\"}".formatted(brandPlusPlanId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Gói này không dành cho tài khoản người dùng"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM consumer_billing_orders WHERE user_id = ?",
                Long.class, consumer.getUserId())).isZero();
    }

    @Test
    void checkoutIsRejectedWhileThePlanIsOffSale() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        jdbc.update("UPDATE billing_plans SET active = FALSE WHERE code = 'BRAND_PLUS'");

        mockMvc.perform(post("/api/v1/brand/plan/checkout").with(user(owner)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_PLUS_UNAVAILABLE"));
        mockMvc.perform(get("/api/v1/brand/plan").with(user(owner)))
                .andExpect(jsonPath("$.data.planAvailable").value(false));
    }

    @Test
    void adminUpdatesBrandPlusPriceAndDiscountWithValidation() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testData.createAdmin().user());
        String planId = brandPlusPlanId();
        Instant start = Instant.now().minus(1, ChronoUnit.HOURS);
        Instant end = Instant.now().plus(7, ChronoUnit.DAYS);

        updatePlan(admin, planId, 1_200_000, 120, start, end)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Phần trăm giảm giá phải từ 0 đến 100"));
        updatePlan(admin, planId, 1_200_000, 10, end, start)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Thời điểm kết thúc giảm giá phải sau thời điểm bắt đầu"));
        assertThat(jdbc.queryForObject("SELECT price_vnd FROM billing_plans WHERE code = 'BRAND_PLUS'", Long.class))
                .isEqualTo(LIST_PRICE);

        updatePlan(admin, planId, 1_200_000, 25, start, end)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.audience").value("BRAND"))
                .andExpect(jsonPath("$.data.priceVnd").value(1_200_000))
                .andExpect(jsonPath("$.data.fitkenAmount").value(0))
                .andExpect(jsonPath("$.data.discountPercent").value(25))
                .andExpect(jsonPath("$.data.discountActive").value(true))
                .andExpect(jsonPath("$.data.effectivePriceVnd").value(900_000));

        mockMvc.perform(get("/api/v1/admin/billing/plans").param("audience", "BRAND").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'BRAND_PLUS')].effectivePriceVnd").value(900_000))
                .andExpect(jsonPath("$.data[?(@.audience == 'CONSUMER')]").isEmpty());
        mockMvc.perform(get("/api/v1/admin/billing/plans").param("audience", "CONSUMER").with(user(admin)))
                .andExpect(jsonPath("$.data[?(@.code == 'BRAND_PLUS')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')]").isNotEmpty());
    }

    @Test
    void adminCannotPutDiscountsOnConsumerPlansOrMoveAPlanBetweenAudiences() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testData.createAdmin().user());
        String premiumId = jdbc.queryForObject("SELECT id::text FROM billing_plans WHERE code = 'PREMIUM_MONTHLY'",
                String.class);

        mockMvc.perform(put("/api/v1/admin/billing/plans/{id}", premiumId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"PREMIUM_MONTHLY","name":"FitMe Premium","planType":"SUBSCRIPTION",
                                 "priceVnd":49000,"fitkenAmount":15,"billingPeriodDays":30,"active":true,
                                 "sortOrder":10,"discountPercent":10}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Giảm giá hiện chỉ áp dụng cho gói brand"));
        mockMvc.perform(put("/api/v1/admin/billing/plans/{id}", premiumId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"PREMIUM_MONTHLY","name":"FitMe Premium","planType":"SUBSCRIPTION",
                                 "audience":"BRAND","priceVnd":49000,"fitkenAmount":15,"billingPeriodDays":30,
                                 "active":true,"sortOrder":10}
                                """))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT audience FROM billing_plans WHERE code = 'PREMIUM_MONTHLY'",
                String.class)).isEqualTo("CONSUMER");
    }

    @Test
    void adminCreatesBrandPlanWithoutFitken() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testData.createAdmin().user());
        String code = "BRAND_TEST_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        try {
            mockMvc.perform(post("/api/v1/admin/billing/plans")
                            .with(user(admin))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"code":"%s","name":"Brand test","planType":"SUBSCRIPTION","audience":"BRAND",
                                     "priceVnd":500000,"fitkenAmount":5,"billingPeriodDays":30,"active":false,
                                     "sortOrder":200}
                                    """.formatted(code)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.audience").value("BRAND"))
                    .andExpect(jsonPath("$.data.fitkenAmount").value(0));
        } finally {
            jdbc.update("DELETE FROM billing_plans WHERE code = ?", code);
        }
    }

    @Test
    void expireDueMarksEndedSubscriptionsExpired() throws Exception {
        FitMeUserPrincipal ended = brandOwner();
        FitMeUserPrincipal running = brandOwner();
        UUID endedBrand = brandIdOf(ended);
        UUID runningBrand = brandIdOf(running);
        insertSubscription(endedBrand, Instant.now().minus(31, ChronoUnit.DAYS), Instant.now().minus(1, ChronoUnit.DAYS));
        insertSubscription(runningBrand, Instant.now().minus(1, ChronoUnit.DAYS), Instant.now().plus(29, ChronoUnit.DAYS));

        assertThat(brandPlusService.isPlusActive(endedBrand)).isFalse();
        mockMvc.perform(get("/api/v1/brand/plan").with(user(ended)))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.status").value("EXPIRED"));

        assertThat(brandPlusService.expireDue()).isGreaterThanOrEqualTo(1);

        String sql = "SELECT status FROM brand_subscriptions WHERE brand_id = ?";
        assertThat(jdbc.queryForObject(sql, String.class, endedBrand)).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject(sql, String.class, runningBrand)).isEqualTo("ACTIVE");
        assertThat(brandPlusService.activePlusBrandIds()).contains(runningBrand).doesNotContain(endedBrand);

        FitMeUserPrincipal admin = new FitMeUserPrincipal(testData.createAdmin().user());
        mockMvc.perform(get("/api/v1/admin/brand-subscriptions").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.brandId == '%s')].status".formatted(endedBrand)).value("EXPIRED"))
                .andExpect(jsonPath("$.data[?(@.brandId == '%s')].active".formatted(runningBrand)).value(true))
                .andExpect(jsonPath("$.data[?(@.brandId == '%s')].brandName".formatted(runningBrand)).isNotEmpty());
        mockMvc.perform(get("/api/v1/admin/brands").with(user(admin)))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusActive".formatted(runningBrand)).value(true))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusActive".formatted(endedBrand)).value(false))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusEndsAt".formatted(endedBrand)).isNotEmpty());
        mockMvc.perform(get("/api/v1/admin/brand-subscriptions").with(user(running)))
                .andExpect(status().isForbidden());
    }

    @Test
    void renewalAfterExpiryStartsANewPeriodFromNow() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID brandId = brandIdOf(owner);
        insertSubscription(brandId, Instant.now().minus(40, ChronoUnit.DAYS), Instant.now().minus(10, ChronoUnit.DAYS));

        long orderCode = data(mockMvc.perform(post("/api/v1/brand/plan/checkout").with(user(owner)))
                .andExpect(status().isOk())).get("orderCode").asLong();
        mockMvc.perform(get("/api/v1/brand/plan/orders/{code}", orderCode).with(user(owner)))
                .andExpect(jsonPath("$.data.status").value("PAID"));

        assertThat(endsAt(brandId)).isCloseTo(Instant.now().plus(30, ChronoUnit.DAYS), within(2, ChronoUnit.MINUTES));
        assertThat(jdbc.queryForObject("SELECT starts_at FROM brand_subscriptions WHERE brand_id = ?",
                Timestamp.class, brandId).toInstant()).isCloseTo(Instant.now(), within(2, ChronoUnit.MINUTES));
    }

    private FitMeUserPrincipal brandOwner() {
        return new FitMeUserPrincipal(testData.createBrandOwner().user());
    }

    private UUID brandIdOf(FitMeUserPrincipal owner) {
        return jdbc.queryForObject("SELECT id FROM brands WHERE owner_user_id = ?", UUID.class, owner.getUserId());
    }

    private String brandPlusPlanId() {
        return jdbc.queryForObject("SELECT id::text FROM billing_plans WHERE code = 'BRAND_PLUS'", String.class);
    }

    private void setDiscount(Integer percent, Instant startsAt, Instant endsAt) {
        jdbc.update("UPDATE billing_plans SET discount_percent = ?, discount_starts_at = ?, discount_ends_at = ? "
                        + "WHERE code = 'BRAND_PLUS'",
                percent, startsAt != null ? Timestamp.from(startsAt) : null, endsAt != null ? Timestamp.from(endsAt) : null);
    }

    private void insertSubscription(UUID brandId, Instant startsAt, Instant endsAt) {
        jdbc.update("INSERT INTO brand_subscriptions (brand_id, plan_id, status, starts_at, ends_at) "
                        + "VALUES (?, ?::uuid, 'ACTIVE', ?, ?)",
                brandId, brandPlusPlanId(), Timestamp.from(startsAt), Timestamp.from(endsAt));
    }

    private Instant endsAt(UUID brandId) {
        return jdbc.queryForObject("SELECT ends_at FROM brand_subscriptions WHERE brand_id = ?",
                Timestamp.class, brandId).toInstant();
    }

    private ResultActions updatePlan(FitMeUserPrincipal admin, String planId, long price, int percent,
                                     Instant startsAt, Instant endsAt) throws Exception {
        return mockMvc.perform(put("/api/v1/admin/billing/plans/{id}", planId)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"code":"BRAND_PLUS","name":"FitMe Brand Plus","planType":"SUBSCRIPTION","audience":"BRAND",
                         "priceVnd":%d,"fitkenAmount":0,"billingPeriodDays":30,"active":true,"sortOrder":100,
                         "discountPercent":%d,"discountStartsAt":"%s","discountEndsAt":"%s"}
                        """.formatted(price, percent, startsAt, endsAt)));
    }

    private JsonNode data(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString()).get("data");
    }
}
