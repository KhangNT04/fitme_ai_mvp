package com.fitme.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminGrowthMetricsIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void metricsCountActiveUsersSignupSourcesAndFunnel() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        String source = "tiktok-" + UUID.randomUUID().toString().substring(0, 8);
        String email = "utm-" + UUID.randomUUID() + "@test.fitme.ai";
        String code = registerWithAttribution(email, source);
        String accessToken = objectMapper.readTree(mockMvc.perform(post("/api/v1/auth/verify-email")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"email\":\"%s\",\"token\":\"%s\"}".formatted(email, code)))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString())
                .get("data").get("accessToken").asText();

        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        String json = mockMvc.perform(get("/api/v1/admin/metrics").param("days", "7").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rangeDays").value(7))
                .andExpect(jsonPath("$.data.daily.length()").value(7))
                .andExpect(jsonPath("$.data.funnel[0].key").value("signed_up"))
                .andReturn().getResponse().getContentAsString();
        JsonNode data = objectMapper.readTree(json).get("data");
        assertThat(data.get("users").get("dailyActive").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(data.get("users").get("newUsers").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(data.get("funnel").get(1).get("users").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(data.get("funnel").findValuesAsText("key"))
                .containsExactly("signed_up", "verified", "used_ai", "checkout", "paid");
        assertThat(data.get("revenue").has("orderRevenueVnd")).isFalse();
        assertThat(data.get("checkout").has("orderCheckoutsStarted")).isFalse();
        boolean sourceListed = false;
        for (JsonNode row : data.get("signupSources")) {
            if (source.equals(row.get("source").asText())) {
                sourceListed = row.get("users").asLong() == 1;
            }
        }
        assertThat(sourceListed).isTrue();

        mockMvc.perform(get("/api/v1/admin/metrics").param("days", "1000").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rangeDays").value(90));
    }

    @Test
    void payingCustomersReportListsPaidProSubscriptionsAndExportsCsv() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        FitMeUserPrincipal buyer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String planId = null;
        for (JsonNode plan : objectMapper.readTree(mockMvc.perform(get("/api/v1/plans"))
                .andReturn().getResponse().getContentAsString()).get("data")) {
            if ("PRO_MONTHLY".equals(plan.get("code").asText())) {
                planId = plan.get("id").asText();
            }
        }
        assertThat(planId).as("PRO_MONTHLY plan seeded by V18").isNotNull();
        mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .with(user(buyer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": \"%s\"}".formatted(planId)))
                .andExpect(status().isOk());

        String json = mockMvc.perform(get("/api/v1/admin/reports/paying-customers").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.payosMock").value(true))
                .andReturn().getResponse().getContentAsString();
        JsonNode report = objectMapper.readTree(json).get("data");
        JsonNode buyerRow = null;
        for (JsonNode row : report.get("rows")) {
            if (buyer.getUserId().toString().equals(row.get("userId").asText())) {
                buyerRow = row;
            }
        }
        assertThat(buyerRow).isNotNull();
        assertThat(buyerRow.get("kind").asText()).isEqualTo("PRO_SUBSCRIPTION");
        assertThat(buyerRow.get("amountVnd").asLong()).isEqualTo(49000);
        assertThat(buyerRow.get("mock").asBoolean()).isTrue();
        assertThat(report.get("payingCustomers").asLong()).isGreaterThanOrEqualTo(1);

        MvcResult csv = mockMvc.perform(get("/api/v1/admin/reports/paying-customers/export").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString(".csv")))
                .andReturn();
        String content = new String(csv.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
        assertThat(content).contains(buyerRow.get("email").asText()).contains("Gói FitMe Pro");
    }

    @Test
    void reportsAreAdminOnly() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        mockMvc.perform(get("/api/v1/admin/metrics").with(user(consumer)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/reports/paying-customers/export").with(user(consumer)))
                .andExpect(status().isForbidden());
    }

    private String registerWithAttribution(String email, String source) throws Exception {
        JsonNode captcha = objectMapper.readTree(mockMvc.perform(get("/api/v1/auth/captcha"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data");
        String body = objectMapper.writeValueAsString(java.util.Map.of(
                "email", email,
                "password", "Test12345!",
                "displayName", "UTM User",
                "website", "",
                "captchaId", captcha.get("captchaId").asText(),
                "captchaAnswer", String.valueOf(parseCaptchaAnswer(captcha.get("question").asText())),
                "formStartedAtMs", System.currentTimeMillis() - 5_000,
                "utmSource", source,
                "utmMedium", "social",
                "referrer", "https://www.tiktok.com/"));
        return objectMapper.readTree(mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("verificationCode").asText();
    }
}
