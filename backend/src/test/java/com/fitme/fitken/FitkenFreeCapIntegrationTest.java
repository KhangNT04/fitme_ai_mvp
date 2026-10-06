package com.fitme.fitken;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.fitken.service.FitkenService;
import com.fitme.settings.service.SystemSettingsService;
import com.fitme.support.TestDataHelper;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FitkenFreeCapIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private FitkenService fitkenService;

    @Autowired
    private SystemSettingsService settingsService;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void restoreCap() {
        settingsService.update(SystemSettingsService.FITKEN_MAX_BALANCE, "50", null);
    }

    @Test
    void walletAndSummaryExposeTheCap() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        mockMvc.perform(get("/api/v1/me/fitken").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maxBalance").value(50));
        mockMvc.perform(get("/api/v1/rewards").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maxBalance").value(50));
    }

    @Test
    void shareRewardIsCappedAndAdminRejectRevokesOnlyWhatWasGranted() throws Exception {
        setCap(7);
        FitMeUserPrincipal alice = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        assertThat(fitkenService.balance(alice.getUserId())).isEqualTo(5);

        String body = mockMvc.perform(post("/api/v1/rewards/share")
                        .with(user(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"postUrl\": \"https://www.instagram.com/p/%s/\"}".formatted(UUID.randomUUID())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rewardGranted").value(2))
                .andExpect(jsonPath("$.data.rewardIntended").value(3))
                .andExpect(jsonPath("$.data.rewardCapped").value(true))
                .andExpect(jsonPath("$.data.maxBalance").value(7))
                .andReturn().getResponse().getContentAsString();
        String claimId = objectMapper.readTree(body).get("data").get("id").asText();
        assertThat(fitkenService.balance(alice.getUserId())).isEqualTo(7);

        mockMvc.perform(post("/api/v1/admin/rewards/shares/{id}/reject", claimId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"Bài đăng đã bị xoá\"}"))
                .andExpect(status().isOk());
        assertThat(fitkenService.balance(alice.getUserId())).isEqualTo(5);
    }

    @Test
    void freeGrantAtTheCapAddsNothingAndWritesNoLedgerRow() {
        setCap(5);
        UUID userId = testDataHelper.createUser().user().getId();
        assertThat(fitkenService.balance(userId)).isEqualTo(5);

        int granted = fitkenService.grant(userId, FitkenEntryType.CHECKIN_REWARD, 1, FitkenService.Bucket.BONUS,
                "TEST_CHECKIN", UUID.randomUUID(), "Thưởng điểm danh");

        assertThat(granted).isZero();
        assertThat(fitkenService.balance(userId)).isEqualTo(5);
        assertThat(ledgerRows(userId, FitkenEntryType.CHECKIN_REWARD)).isZero();
    }

    @Test
    void trialGrantIsCappedToo() {
        setCap(3);
        UUID userId = testDataHelper.createUser().user().getId();
        assertThat(fitkenService.balance(userId)).isEqualTo(3);
    }

    @Test
    void paidSubscriptionAndAdminCreditsAreNeverCapped() {
        setCap(5);
        UUID userId = testDataHelper.createUser().user().getId();
        assertThat(fitkenService.balance(userId)).isEqualTo(5);

        assertThat(fitkenService.grant(userId, FitkenEntryType.SUBSCRIPTION_GRANT, 15, FitkenService.Bucket.SUBSCRIPTION,
                FitkenService.REF_SUBSCRIPTION, UUID.randomUUID(), "Fitken gói Premium")).isEqualTo(15);
        assertThat(fitkenService.grant(userId, FitkenEntryType.TOPUP_GRANT, 10, FitkenService.Bucket.BONUS,
                FitkenService.REF_BILLING_ORDER, UUID.randomUUID(), "Mua thêm Fitken")).isEqualTo(10);
        fitkenService.adminAdjust(userId, 20, "Admin cộng thêm");
        assertThat(fitkenService.balance(userId)).isEqualTo(50);

        // Over the cap: free rewards stop, but the paid balance is untouched.
        assertThat(fitkenService.grant(userId, FitkenEntryType.SHARE_REWARD, 3, FitkenService.Bucket.BONUS,
                "TEST_SHARE", UUID.randomUUID(), "Thưởng chia sẻ")).isZero();
        assertThat(fitkenService.balance(userId)).isEqualTo(50);
    }

    @Test
    void cappedSourcesAreOnlyFreeOnes() {
        assertThat(FitkenService.isCappedSource(FitkenEntryType.TRIAL_GRANT)).isTrue();
        assertThat(FitkenService.isCappedSource(FitkenEntryType.CHECKIN_REWARD)).isTrue();
        assertThat(FitkenService.isCappedSource(FitkenEntryType.SHARE_REWARD)).isTrue();
        assertThat(FitkenService.isCappedSource(FitkenEntryType.REVIEW_REWARD)).isTrue();
        assertThat(FitkenService.isCappedSource(FitkenEntryType.SUBSCRIPTION_GRANT)).isFalse();
        assertThat(FitkenService.isCappedSource(FitkenEntryType.TOPUP_GRANT)).isFalse();
        assertThat(FitkenService.isCappedSource(FitkenEntryType.ADMIN_ADJUST)).isFalse();
        assertThat(FitkenService.isCappedSource(FitkenEntryType.REFUND)).isFalse();
    }

    private void setCap(int cap) {
        settingsService.update(SystemSettingsService.FITKEN_MAX_BALANCE, Integer.toString(cap), null);
    }

    private int ledgerRows(UUID userId, FitkenEntryType type) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM fitken_ledger WHERE user_id = ? AND entry_type = ?",
                Integer.class, userId, type.name());
        return count == null ? 0 : count;
    }
}
