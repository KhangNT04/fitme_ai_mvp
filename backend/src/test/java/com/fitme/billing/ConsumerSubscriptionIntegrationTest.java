package com.fitme.billing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConsumerSubscriptionIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Autowired
    private com.fitme.billing.service.BillingOrderExpiryJob billingOrderExpiryJob;

    @Test
    void plansArePublic() throws Exception {
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')].fitkenAmount").value(15))
                .andExpect(jsonPath("$.data[0].freeshipVouchers").doesNotExist())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')].priceVnd").value(49000));
    }

    @Test
    void mockPremiumCheckoutGrantsFitken() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String planId = premiumPlanId();

        String checkoutJson = mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": \"%s\"}".formatted(planId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.checkoutUrl").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        long orderCode = objectMapper.readTree(checkoutJson).get("data").get("payosOrderCode").asLong();

        // Return twice: confirmation is idempotent and never double-grants.
        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/me/subscription/return")
                            .with(user(principal))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"orderCode\": %d}".formatted(orderCode)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("PAID"));
        }

        mockMvc.perform(get("/api/v1/me/fitken").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subscriptionRemaining").value(15))
                .andExpect(jsonPath("$.data.balance").value(20))
                .andExpect(jsonPath("$.data.plan").value("PREMIUM"))
                .andExpect(jsonPath("$.data.subscription.status").value("ACTIVE"));

        mockMvc.perform(get("/api/v1/me/entitlement").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("PREMIUM"))
                .andExpect(jsonPath("$.data.premium").value(true))
                .andExpect(jsonPath("$.data.pro").value(true))
                .andExpect(jsonPath("$.data.label").value("FitMe Premium"))
                .andExpect(jsonPath("$.data.plus").doesNotExist());

        mockMvc.perform(get("/api/v1/me/subscription/orders").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    void returnForSomeoneElsesOrderIsRejected() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal other = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String checkoutJson = mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": \"%s\"}".formatted(premiumPlanId())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long orderCode = objectMapper.readTree(checkoutJson).get("data").get("payosOrderCode").asLong();

        mockMvc.perform(post("/api/v1/me/subscription/return")
                        .with(user(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderCode\": %d}".formatted(orderCode)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void webhookActivatesOnlySuccessfulFullPayments() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        long orderCode = System.nanoTime() % 1_000_000_000L + 9_000_000_000L;
        jdbc.update("INSERT INTO consumer_billing_orders (user_id, plan_id, amount_vnd, status, payos_order_code) "
                + "VALUES (?, ?::uuid, 49000, 'PENDING', ?)", principal.getUserId(), premiumPlanId(), orderCode);

        for (String data : new String[]{
                "{\"orderCode\":%d,\"code\":\"01\",\"amount\":49000}".formatted(orderCode),
                "{\"orderCode\":%d,\"code\":\"00\",\"amount\":1000}".formatted(orderCode)}) {
            mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"data\":" + data + "}"))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/api/v1/me/entitlement").with(user(principal)))
                    .andExpect(jsonPath("$.data.plan").value("FREE"));
        }

        mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"data\":{\"orderCode\":%d,\"code\":\"00\",\"amount\":49000}}".formatted(orderCode)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/me/entitlement").with(user(principal)))
                .andExpect(jsonPath("$.data.plan").value("PREMIUM"));
    }

    @Test
    void stalePendingCheckoutsExpireButFreshOnesStayPending() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        long staleCode = System.nanoTime() % 1_000_000_000L + 8_000_000_000L;
        long freshCode = staleCode + 1;
        jdbc.update("INSERT INTO consumer_billing_orders (user_id, plan_id, amount_vnd, status, payos_order_code, created_at) "
                + "VALUES (?, ?::uuid, 49000, 'PENDING', ?, NOW() - INTERVAL '2 days')", principal.getUserId(), premiumPlanId(), staleCode);
        jdbc.update("INSERT INTO consumer_billing_orders (user_id, plan_id, amount_vnd, status, payos_order_code) "
                + "VALUES (?, ?::uuid, 49000, 'PENDING', ?)", principal.getUserId(), premiumPlanId(), freshCode);

        billingOrderExpiryJob.expireStalePendingOrders();

        String sql = "SELECT status FROM consumer_billing_orders WHERE payos_order_code = ?";
        assertThat(jdbc.queryForObject(sql, String.class, staleCode)).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject(sql, String.class, freshCode)).isEqualTo("PENDING");
    }

    @Test
    void adminGrantPremiumCreatesSubscriptionWithFitken() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());

        mockMvc.perform(get("/api/v1/me/entitlement").with(user(principal)))
                .andExpect(jsonPath("$.data.plan").value("FREE"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/me/entitlement/users/{userId}", principal.getUserId())
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\": \"PREMIUM\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("PREMIUM"));

        mockMvc.perform(get("/api/v1/me/fitken").with(user(principal)))
                .andExpect(jsonPath("$.data.subscriptionRemaining").value(15))
                .andExpect(jsonPath("$.data.plan").value("PREMIUM"));
    }

    private String premiumPlanId() throws Exception {
        String json = mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        for (JsonNode plan : objectMapper.readTree(json).get("data")) {
            if ("PREMIUM_MONTHLY".equals(plan.get("code").asText())) {
                return plan.get("id").asText();
            }
        }
        assertThat(false).as("PREMIUM_MONTHLY plan (renamed by V28)").isTrue();
        return null;
    }
}
