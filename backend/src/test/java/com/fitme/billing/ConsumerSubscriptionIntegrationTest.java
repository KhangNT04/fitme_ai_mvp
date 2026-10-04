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

    @Test
    void plansArePublic() throws Exception {
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'PRO_MONTHLY')].fitkenAmount").value(15))
                .andExpect(jsonPath("$.data[?(@.code == 'PRO_MONTHLY')].freeshipVouchers").value(2))
                .andExpect(jsonPath("$.data[?(@.code == 'PRO_MONTHLY')].priceVnd").value(49000));
    }

    @Test
    void mockProCheckoutGrantsFitkenAndFreeshipVouchers() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String planId = proPlanId();

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
                .andExpect(jsonPath("$.data.plan").value("PRO"))
                .andExpect(jsonPath("$.data.subscription.status").value("ACTIVE"));

        mockMvc.perform(get("/api/v1/me/vouchers").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].maxDiscountVnd").value(30000));

        mockMvc.perform(get("/api/v1/me/entitlement").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("PRO"))
                .andExpect(jsonPath("$.data.pro").value(true))
                .andExpect(jsonPath("$.data.plus").value(true));

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
                        .content("{\"planId\": \"%s\"}".formatted(proPlanId())))
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
    void adminGrantProCreatesSubscriptionWithFitken() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());

        mockMvc.perform(get("/api/v1/me/entitlement").with(user(principal)))
                .andExpect(jsonPath("$.data.plan").value("FREE"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/me/entitlement/users/{userId}", principal.getUserId())
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plan\": \"PLUS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("PRO"));

        mockMvc.perform(get("/api/v1/me/fitken").with(user(principal)))
                .andExpect(jsonPath("$.data.subscriptionRemaining").value(15))
                .andExpect(jsonPath("$.data.plan").value("PRO"));
    }

    private String proPlanId() throws Exception {
        String json = mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        for (JsonNode plan : objectMapper.readTree(json).get("data")) {
            if ("PRO_MONTHLY".equals(plan.get("code").asText())) {
                return plan.get("id").asText();
            }
        }
        assertThat(false).as("PRO_MONTHLY plan seeded by V18").isTrue();
        return null;
    }
}
