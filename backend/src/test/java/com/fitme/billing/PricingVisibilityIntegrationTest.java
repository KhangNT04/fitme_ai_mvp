package com.fitme.billing;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Admin ẩn/hiện gói trả phí cho người dùng: công tắc chung {@code pricing.show_paid} và cờ
 * {@code visible} riêng từng gói. Người đã mua vẫn dùng Premium bình thường.
 */
class PricingVisibilityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void restoreTheGlobalSwitch() throws Exception {
        jdbc.update("UPDATE billing_plans SET visible = true WHERE code = 'PREMIUM_MONTHLY'");
        setPaidVisibility(true);
    }

    @Test
    void thePaidPlansAreVisibleByDefault() throws Exception {
        mockMvc.perform(get("/api/v1/pricing/visibility"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.showPaid").value(true));
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')]").isNotEmpty());
    }

    @Test
    void hidingThePaidPlans_removesThemFromThePublicPlanList() throws Exception {
        setPaidVisibility(false);

        mockMvc.perform(get("/api/v1/pricing/visibility"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.showPaid").value(false));
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void hidingThePaidPlans_blocksTheCheckout() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String planId = premiumPlanId();
        setPaidVisibility(false);

        mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": \"%s\"}".formatted(planId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PLAN_HIDDEN"));
    }

    @Test
    void hidingThePaidPlans_doesNotRevokeAnActiveSubscription() throws Exception {
        UserAccount premium = testDataHelper.createPremiumUser().user();
        setPaidVisibility(false);

        // Gói đã mua vẫn còn hiệu lực.
        mockMvc.perform(get("/api/v1/me/entitlement").with(user(new FitMeUserPrincipal(premium))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("PREMIUM"));
    }

    @Test
    void hidingThePaidPlans_removesTheUpsellCopyForFreeUsers() throws Exception {
        UserAccount free = testDataHelper.createUser().user();
        setPaidVisibility(false);

        mockMvc.perform(get("/api/v1/me/entitlement").with(user(new FitMeUserPrincipal(free))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plan").value("FREE"))
                .andExpect(jsonPath("$.data.upsellMessage").doesNotExist());
    }

    @Test
    void aHiddenPlan_isNotListedOnThePricingPageButStillVisibleToAdmins() throws Exception {
        UUID planId = UUID.fromString(premiumPlanId());
        jdbc.update("UPDATE billing_plans SET visible = false WHERE id = ?", planId);

        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')]").isEmpty());

        // Admin vẫn thấy gói đã ẩn.
        mockMvc.perform(get("/api/v1/admin/billing/plans?audience=CONSUMER")
                        .with(user(new FitMeUserPrincipal(testDataHelper.createAdmin().user()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')].visible").value(false));
    }

    @Test
    void aHiddenPlan_cannotBeCheckedOut() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String planId = premiumPlanId();
        jdbc.update("UPDATE billing_plans SET visible = false WHERE id = ?::uuid", planId);

        mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": \"%s\"}".formatted(planId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PLAN_HIDDEN"));
    }

    @Test
    void aNonAdmin_cannotToggleTheVisibility() throws Exception {
        UserAccount account = testDataHelper.createUser().user();

        mockMvc.perform(put("/api/v1/admin/pricing/visibility")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"showPaid\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdmin_canHideAndShowThePaidPlansAgain() throws Exception {
        setPaidVisibility(false);
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());

        setPaidVisibility(true);
        mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'PREMIUM_MONTHLY')]").isNotEmpty());
    }

    /** Bật/tắt công tắc chung qua API admin (nó cũng xoá cache của system settings). */
    private void setPaidVisibility(boolean showPaid) throws Exception {
        mockMvc.perform(put("/api/v1/admin/pricing/visibility")
                        .with(user(new FitMeUserPrincipal(testDataHelper.createAdmin().user())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"showPaid\":%s}".formatted(showPaid)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.showPaid").value(showPaid));
    }

    private String premiumPlanId() throws Exception {
        JsonNode plans = objectMapper.readTree(mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data");
        for (JsonNode plan : plans) {
            if ("PREMIUM_MONTHLY".equals(plan.get("code").asText())) {
                return plan.get("id").asText();
            }
        }
        throw new AssertionError("PREMIUM_MONTHLY plan (renamed by V28)");
    }
}
