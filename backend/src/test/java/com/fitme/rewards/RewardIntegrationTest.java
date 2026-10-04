package com.fitme.rewards;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.common.time.AppClock;
import com.fitme.fitken.service.FitkenService;
import com.fitme.rewards.service.ShareUrlPolicy;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RewardIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private AppClock appClock;

    @Autowired
    private FitkenService fitkenService;

    @AfterEach
    void resetClock() {
        appClock.reset();
    }

    @Test
    void thirdConsecutiveCheckinGrantsReward() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());

        // 23:30 on 1 March in Vietnam; one hour later is already 2 March there.
        pinClock("2026-03-01T16:30:00Z");
        checkin(principal).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak").value(1))
                .andExpect(jsonPath("$.data.rewardGranted").value(0))
                .andExpect(jsonPath("$.data.balance").value(5));
        checkin(principal).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("ALREADY_CHECKED_IN"));

        pinClock("2026-03-01T17:30:00Z");
        checkin(principal).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak").value(2))
                .andExpect(jsonPath("$.data.rewardGranted").value(0));

        pinClock("2026-03-03T02:00:00Z");
        mockMvc.perform(get("/api/v1/rewards").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.checkin.checkedInToday").value(false))
                .andExpect(jsonPath("$.data.checkin.currentStreak").value(2))
                .andExpect(jsonPath("$.data.checkin.daysUntilNextReward").value(1));
        checkin(principal).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak").value(3))
                .andExpect(jsonPath("$.data.rewardGranted").value(1))
                .andExpect(jsonPath("$.data.balance").value(6));

        pinClock("2026-03-05T02:00:00Z");
        checkin(principal).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentStreak").value(1))
                .andExpect(jsonPath("$.data.rewardGranted").value(0));
    }

    @Test
    void rewardsRequireLogin() throws Exception {
        mockMvc.perform(post("/api/v1/rewards/checkin")).andExpect(status().is4xxClientError());
    }

    @Test
    void shareUrlValidation() {
        assertThat(ShareUrlPolicy.validate("https://www.facebook.com/minhanh/posts/123?utm_source=x&fbclid=abc"))
                .isEqualTo(new ShareUrlPolicy.SharePost("https://facebook.com/minhanh/posts/123", "FACEBOOK"));
        assertThat(ShareUrlPolicy.validate("https://vt.tiktok.com/ZS123/").platform()).isEqualTo("TIKTOK");
        assertThat(ShareUrlPolicy.validate("https://x.com/a/status/1?s=20").canonicalUrl())
                .isEqualTo("https://x.com/a/status/1?s=20");

        for (String bad : new String[]{
                "http://facebook.com/p/1",
                "https://facebook.com/",
                "https://evil-facebook.com/p/1",
                "https://facebook.com.evil.io/p/1",
                "javascript:alert(1)",
                "not a url"}) {
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> ShareUrlPolicy.validate(bad))
                    .as(bad)
                    .hasFieldOrPropertyWithValue("code", "SHARE_INVALID_URL");
        }
    }

    @Test
    void shareRewardRespectsDailyLimitDuplicatesAndAdminReject() throws Exception {
        FitMeUserPrincipal alice = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal bob = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        String postId = UUID.randomUUID().toString();

        share(alice, "https://instagram.com/").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("SHARE_INVALID_URL"));

        String body = share(alice, "https://www.instagram.com/p/" + postId + "/?igsh=xyz")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.platform").value("INSTAGRAM"))
                .andExpect(jsonPath("$.data.rewardGranted").value(3))
                .andReturn().getResponse().getContentAsString();
        String claimId = objectMapper.readTree(body).get("data").get("id").asText();
        assertThat(fitkenService.balance(alice.getUserId())).isEqualTo(8);

        share(alice, "https://tiktok.com/@alice/video/" + postId).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("SHARE_DAILY_LIMIT"));

        share(bob, "https://instagram.com/p/" + postId).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("SHARE_DUPLICATE"));

        mockMvc.perform(get("/api/v1/admin/rewards/shares").param("status", "APPROVED").with(user(admin)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/admin/rewards/shares/{id}/reject", claimId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"Bài đăng đã bị xoá\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
        assertThat(fitkenService.balance(alice.getUserId())).isEqualTo(5);

        // Rejecting twice must not take the reward back again.
        mockMvc.perform(post("/api/v1/admin/rewards/shares/{id}/reject", claimId).with(user(admin)))
                .andExpect(status().isOk());
        assertThat(fitkenService.balance(alice.getUserId())).isEqualTo(5);

        mockMvc.perform(post("/api/v1/admin/rewards/shares/{id}/reject", claimId).with(user(alice)))
                .andExpect(status().isForbidden());
    }

    private ResultActions checkin(FitMeUserPrincipal principal) throws Exception {
        return mockMvc.perform(post("/api/v1/rewards/checkin").with(user(principal)));
    }

    private ResultActions share(FitMeUserPrincipal principal, String url) throws Exception {
        return mockMvc.perform(post("/api/v1/rewards/share")
                .with(user(principal))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"postUrl\": \"%s\"}".formatted(url)));
    }

    private void pinClock(String instant) {
        appClock.setClock(Clock.fixed(Instant.parse(instant), AppClock.BUSINESS_ZONE));
    }
}
