package com.fitme.brandlead;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.brand.entity.Brand;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.common.time.AppClock;
import com.fitme.privacy.service.UserDataEraser;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Phase 6 leads: consent-gated lead capture on buy clicks, the Brand Plus lead list and sold confirmation. */
class BrandLeadIntegrationTest extends AbstractIntegrationTest {

    private static final String LONG_REVIEW = "Áo mặc rất vừa, chất vải mát và đúng màu như ảnh.";

    @Autowired
    private TestDataHelper testData;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private UserDataEraser userDataEraser;

    @Autowired
    private AppClock clock;

    @Test
    void clickWithoutConsentCreatesNoLead() throws Exception {
        Product product = productOf(testData.createBrandOwner().brand());
        FitMeUserPrincipal customer = customer();

        buyClick(customer, product).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.redirectUrl").value(product.getPurchaseUrl()));
        setConsent(customer, false);
        buyClick(customer, product).andExpect(status().isOk());

        assertThat(leadCount(product)).isZero();
    }

    @Test
    void consentingCustomerGetsOneLeadPerProductAndDay() throws Exception {
        Brand brand = testData.createBrandOwner().brand();
        Product product = productOf(brand);
        Product other = productOf(brand);
        FitMeUserPrincipal customer = customer();
        setConsent(customer, true);

        UUID firstEvent = eventId(buyClick(customer, product).andExpect(status().isOk()));
        buyClick(customer, product).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.redirectUrl").value(product.getPurchaseUrl()));
        buyClick(customer, other).andExpect(status().isOk());

        assertThat(leadCount(product)).isEqualTo(1);
        assertThat(leadCount(other)).isEqualTo(1);
        Map<String, Object> lead = jdbc.queryForMap("SELECT brand_id, user_id, buy_click_event_id, size, color, lead_date, "
                + "confirmed_sold_at, anonymized_at FROM brand_leads WHERE product_id = ?", product.getId());
        assertThat(lead)
                .containsEntry("brand_id", brand.getId())
                .containsEntry("user_id", customer.getUserId())
                .containsEntry("buy_click_event_id", firstEvent)
                .containsEntry("size", "M")
                .containsEntry("color", "Đen")
                .containsEntry("confirmed_sold_at", null)
                .containsEntry("anonymized_at", null);
        assertThat(((java.sql.Date) lead.get("lead_date")).toLocalDate()).isEqualTo(clock.today());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM buy_click_events WHERE product_id = ?", Long.class,
                product.getId())).isEqualTo(2);

        jdbc.update("UPDATE brand_leads SET lead_date = lead_date - 1 WHERE product_id = ?", product.getId());
        buyClick(customer, product).andExpect(status().isOk());
        assertThat(leadCount(product)).isEqualTo(2);

        setConsent(customer, false);
        buyClick(customer, productOf(brand)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_leads WHERE brand_id = ?", Long.class,
                brand.getId())).isEqualTo(3);
    }

    @Test
    void anonymousClickStillRedirectsButNeverCreatesALead() throws Exception {
        Product product = productOf(testData.createBrandOwner().brand());
        String session = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/redirects/buy-click")
                        .header(SESSION_HEADER, session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(buyClickBody(product)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.redirectUrl").value(product.getPurchaseUrl()));

        assertThat(leadCount(product)).isZero();
    }

    @Test
    void plusBrandSeesCustomerDetails_nonPlusBrandOnlyCounts() throws Exception {
        TestDataHelper.BrandOwnerContext plus = testData.createBrandOwner();
        TestDataHelper.BrandOwnerContext free = testData.createBrandOwner();
        activatePlus(plus.brand().getId());
        Product plusProduct = productOf(plus.brand());
        Product freeProduct = productOf(free.brand());
        UserAccount account = testData.createUser().user();
        FitMeUserPrincipal customer = new FitMeUserPrincipal(account);
        setConsent(customer, true);
        buyClick(customer, plusProduct).andExpect(status().isOk());
        buyClick(customer, freeProduct).andExpect(status().isOk());

        leads(plus.user(), Map.of())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plusRequired").value(false))
                .andExpect(jsonPath("$.data.summary.total").value(1))
                .andExpect(jsonPath("$.data.summary.sold").value(0))
                .andExpect(jsonPath("$.data.summary.last30Days").value(1))
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.items[0].productId").value(plusProduct.getId().toString()))
                .andExpect(jsonPath("$.data.items[0].productName").value(plusProduct.getName()))
                .andExpect(jsonPath("$.data.items[0].customerName").value("Test User"))
                .andExpect(jsonPath("$.data.items[0].customerEmail").value(account.getEmail()))
                .andExpect(jsonPath("$.data.items[0].customerStatus").value("VISIBLE"))
                .andExpect(jsonPath("$.data.items[0].size").value("M"))
                .andExpect(jsonPath("$.data.items[0].color").value("Đen"))
                .andExpect(jsonPath("$.data.items[0].createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.items[0].confirmedSoldAt").doesNotExist());

        String freeBody = leads(free.user(), Map.of())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plusRequired").value(true))
                .andExpect(jsonPath("$.data.summary.total").value(1))
                .andExpect(jsonPath("$.data.summary.last30Days").value(1))
                .andExpect(jsonPath("$.data.items", hasSize(0)))
                .andExpect(jsonPath("$.data.totalItems").value(0))
                .andReturn().getResponse().getContentAsString();
        assertThat(freeBody).doesNotContain(account.getEmail()).doesNotContain("Test User");

        mockMvc.perform(get("/api/v1/brand/leads").with(user(customer))).andExpect(status().isForbidden());
    }

    @Test
    void plusLeadListFiltersAndPaginates() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        activatePlus(owner.brand().getId());
        Product shirt = productOf(owner.brand());
        Product pants = productOf(owner.brand());
        FitMeUserPrincipal first = consentingCustomer();
        FitMeUserPrincipal second = consentingCustomer();
        buyClick(first, shirt).andExpect(status().isOk());
        buyClick(second, shirt).andExpect(status().isOk());
        buyClick(first, pants).andExpect(status().isOk());
        UUID old = leadId(first, pants);
        jdbc.update("UPDATE brand_leads SET created_at = NOW() - INTERVAL '40 days', confirmed_sold_at = NOW() "
                + "WHERE id = ?", old);

        leads(owner.user(), Map.of("size", "2"))
                .andExpect(jsonPath("$.data.summary.total").value(3))
                .andExpect(jsonPath("$.data.summary.sold").value(1))
                .andExpect(jsonPath("$.data.summary.last30Days").value(2))
                .andExpect(jsonPath("$.data.totalItems").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.items", hasSize(2)));
        leads(owner.user(), Map.of("size", "2", "page", "1"))
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.items[0].id").value(old.toString()));
        leads(owner.user(), Map.of("productId", shirt.getId().toString()))
                .andExpect(jsonPath("$.data.totalItems").value(2));
        leads(owner.user(), Map.of("sold", "true"))
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.items[0].id").value(old.toString()));
        leads(owner.user(), Map.of("sold", "false"))
                .andExpect(jsonPath("$.data.totalItems").value(2));
        LocalDate today = clock.today();
        leads(owner.user(), Map.of("from", today.minusDays(7).toString(), "to", today.toString()))
                .andExpect(jsonPath("$.data.totalItems").value(2));
        leads(owner.user(), Map.of("to", today.minusDays(30).toString()))
                .andExpect(jsonPath("$.data.items[0].id").value(old.toString()))
                .andExpect(jsonPath("$.data.totalItems").value(1));
        leads(owner.user(), Map.of("from", today.toString(), "to", today.minusDays(1).toString()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void markingSoldNeedsPlusAndTheBrandsOwnLead() throws Exception {
        TestDataHelper.BrandOwnerContext plus = testData.createBrandOwner();
        TestDataHelper.BrandOwnerContext otherPlus = testData.createBrandOwner();
        TestDataHelper.BrandOwnerContext free = testData.createBrandOwner();
        activatePlus(plus.brand().getId());
        activatePlus(otherPlus.brand().getId());
        FitMeUserPrincipal customer = consentingCustomer();
        Product product = productOf(plus.brand());
        Product freeProduct = productOf(free.brand());
        buyClick(customer, product).andExpect(status().isOk());
        buyClick(customer, freeProduct).andExpect(status().isOk());
        UUID leadId = leadId(customer, product);
        UUID freeLead = leadId(customer, freeProduct);

        markSold(otherPlus.user(), leadId, true).andExpect(status().isNotFound());
        markSold(plus.user(), UUID.randomUUID(), true).andExpect(status().isNotFound());
        markSold(free.user(), freeLead, true)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("PLUS_REQUIRED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_leads WHERE confirmed_sold_at IS NOT NULL "
                + "AND id IN (?, ?)", Long.class, leadId, freeLead)).isZero();
        mockMvc.perform(patch("/api/v1/brand/leads/{id}/sold", leadId)
                        .with(user(new FitMeUserPrincipal(plus.user())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void soldLeadGivesTheCustomersReviewTheVerifiedBadge_andUnmarkingReverts() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        activatePlus(owner.brand().getId());
        Product product = productOf(owner.brand());
        FitMeUserPrincipal customer = consentingCustomer();
        buyClick(customer, product).andExpect(status().isOk());
        UUID leadId = leadId(customer, product);
        mockMvc.perform(post("/api/v1/products/{id}/reviews", product.getId())
                        .with(user(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("rating", 5, "content", LONG_REVIEW,
                                "imageUrls", List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.review.verifiedPurchase").value(false));

        markSold(owner.user(), leadId, true)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(leadId.toString()))
                .andExpect(jsonPath("$.data.confirmedSoldAt").isNotEmpty());
        assertThat(jdbc.queryForObject("SELECT confirmed_by FROM brand_leads WHERE id = ?", UUID.class, leadId))
                .isEqualTo(owner.user().getId());
        Timestamp soldAt = jdbc.queryForObject("SELECT confirmed_sold_at FROM brand_leads WHERE id = ?",
                Timestamp.class, leadId);
        markSold(owner.user(), leadId, true).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT confirmed_sold_at FROM brand_leads WHERE id = ?", Timestamp.class,
                leadId)).isEqualTo(soldAt);
        expectVerified(product, true);
        leads(owner.user(), Map.of()).andExpect(jsonPath("$.data.summary.sold").value(1));

        markSold(owner.user(), leadId, false)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.confirmedSoldAt").doesNotExist());
        assertThat(jdbc.queryForMap("SELECT confirmed_sold_at, confirmed_by FROM brand_leads WHERE id = ?", leadId))
                .containsEntry("confirmed_sold_at", null)
                .containsEntry("confirmed_by", null);
        expectVerified(product, false);

        jdbc.update("UPDATE brand_leads SET lead_date = lead_date - 1 WHERE id = ?", leadId);
        buyClick(customer, product).andExpect(status().isOk());
        UUID secondLead = jdbc.queryForObject("SELECT id FROM brand_leads WHERE user_id = ? AND product_id = ? "
                + "AND id <> ?", UUID.class, customer.getUserId(), product.getId(), leadId);
        markSold(owner.user(), leadId, true).andExpect(status().isOk());
        markSold(owner.user(), secondLead, true).andExpect(status().isOk());
        markSold(owner.user(), leadId, false).andExpect(status().isOk());
        expectVerified(product, true);
    }

    @Test
    void withdrawingConsentHidesTheCustomerFromTheBrand() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        activatePlus(owner.brand().getId());
        Product product = productOf(owner.brand());
        FitMeUserPrincipal customer = consentingCustomer();
        buyClick(customer, product).andExpect(status().isOk());

        setConsent(customer, false);
        leads(owner.user(), Map.of())
                .andExpect(jsonPath("$.data.items[0].customerStatus").value("WITHDRAWN"))
                .andExpect(jsonPath("$.data.items[0].customerName").doesNotExist())
                .andExpect(jsonPath("$.data.items[0].customerEmail").doesNotExist())
                .andExpect(jsonPath("$.data.items[0].productName").value(product.getName()))
                .andExpect(jsonPath("$.data.summary.total").value(1));

        setConsent(customer, true);
        leads(owner.user(), Map.of())
                .andExpect(jsonPath("$.data.items[0].customerStatus").value("VISIBLE"))
                .andExpect(jsonPath("$.data.items[0].customerEmail").value(customer.getEmail()));
    }

    @Test
    void erasingTheAccountAnonymizesItsLeads() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        activatePlus(owner.brand().getId());
        Product product = productOf(owner.brand());
        FitMeUserPrincipal customer = consentingCustomer();
        buyClick(customer, product).andExpect(status().isOk());
        UUID leadId = leadId(customer, product);

        userDataEraser.eraseAll(customer.getUserId(), null);

        assertThat(jdbc.queryForMap("SELECT user_id, anonymized_at IS NOT NULL AS anonymized FROM brand_leads "
                + "WHERE id = ?", leadId))
                .containsEntry("user_id", null)
                .containsEntry("anonymized", true);
        String body = leads(owner.user(), Map.of())
                .andExpect(jsonPath("$.data.summary.total").value(1))
                .andExpect(jsonPath("$.data.items[0].customerStatus").value("ANONYMIZED"))
                .andExpect(jsonPath("$.data.items[0].customerEmail").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain(customer.getEmail()).doesNotContain(customer.getUserId().toString());
        markSold(owner.user(), leadId, true).andExpect(status().isOk());
    }

    private void expectVerified(Product product, boolean verified) throws Exception {
        mockMvc.perform(get("/api/v1/products/{id}/reviews", product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].verifiedPurchase").value(verified));
    }

    private FitMeUserPrincipal customer() {
        return new FitMeUserPrincipal(testData.createUser().user());
    }

    private FitMeUserPrincipal consentingCustomer() throws Exception {
        FitMeUserPrincipal customer = customer();
        setConsent(customer, true);
        return customer;
    }

    private Product productOf(Brand brand) {
        return testData.createEligibleProductForBrand(brand, "Lead product " + UUID.randomUUID(), "Áo thun");
    }

    private void setConsent(FitMeUserPrincipal customer, boolean accepted) throws Exception {
        mockMvc.perform(post("/api/v1/privacy/consent")
                        .with(user(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"consentType\":\"BRAND_LEAD_SHARING\",\"accepted\":" + accepted + "}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/privacy/consent").with(user(customer)))
                .andExpect(jsonPath("$.data.BRAND_LEAD_SHARING").value(accepted));
    }

    private ResultActions buyClick(FitMeUserPrincipal customer, Product product) throws Exception {
        return mockMvc.perform(post("/api/v1/redirects/buy-click")
                .with(user(customer))
                .contentType(MediaType.APPLICATION_JSON)
                .content(buyClickBody(product)));
    }

    private static String buyClickBody(Product product) {
        return """
                {"productId":"%s","sourcePage":"product-detail","selectedSize":"M","selectedColor":"Đen"}
                """.formatted(product.getId());
    }

    private ResultActions leads(UserAccount owner, Map<String, String> params) throws Exception {
        var request = get("/api/v1/brand/leads").with(user(new FitMeUserPrincipal(owner)));
        params.forEach(request::param);
        return mockMvc.perform(request);
    }

    private ResultActions markSold(UserAccount owner, UUID leadId, boolean sold) throws Exception {
        return mockMvc.perform(patch("/api/v1/brand/leads/{id}/sold", leadId)
                .with(user(new FitMeUserPrincipal(owner)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"sold\":" + sold + "}"));
    }

    private void activatePlus(UUID brandId) {
        jdbc.update("INSERT INTO brand_subscriptions (brand_id, plan_id, status, starts_at, ends_at) "
                        + "VALUES (?, (SELECT id FROM billing_plans WHERE code = 'BRAND_PLUS'), 'ACTIVE', ?, ?)",
                brandId, Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)),
                Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS)));
    }

    private long leadCount(Product product) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM brand_leads WHERE product_id = ?", Long.class, product.getId());
    }

    private UUID leadId(FitMeUserPrincipal customer, Product product) {
        return jdbc.queryForObject("SELECT id FROM brand_leads WHERE user_id = ? AND product_id = ?", UUID.class,
                customer.getUserId(), product.getId());
    }

    private UUID eventId(ResultActions actions) throws Exception {
        JsonNode data = objectMapper.readTree(actions.andReturn().getResponse().getContentAsString()).get("data");
        return UUID.fromString(data.get("eventId").asText());
    }
}
