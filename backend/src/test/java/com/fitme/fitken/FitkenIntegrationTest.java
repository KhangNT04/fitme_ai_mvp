package com.fitme.fitken;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.fitken.repository.FitkenLedgerRepository;
import com.fitme.fitken.service.FitkenService;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FitkenIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private FitkenService fitkenService;

    @Autowired
    private FitkenLedgerRepository ledgerRepository;

    @Test
    void trialFitkenIsGrantedExactlyOnce() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(get("/api/v1/me/fitken").with(user(principal)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.balance").value(5))
                    .andExpect(jsonPath("$.data.bonusRemaining").value(5))
                    .andExpect(jsonPath("$.data.trialGranted").value(true))
                    .andExpect(jsonPath("$.data.plan").value("FREE"));
        }

        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.TRIAL_GRANT))
                .isEqualTo(1);
        mockMvc.perform(get("/api/v1/me/fitken/ledger").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].entryType").value("TRIAL_GRANT"));
    }

    @Test
    void walletRequiresLogin() throws Exception {
        mockMvc.perform(get("/api/v1/me/fitken"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void consumeAndRefundAreIdempotentPerReference() {
        UUID userId = testDataHelper.createUser().user().getId();
        UUID previewId = UUID.randomUUID();

        fitkenService.consumeForTryOn(userId, previewId);
        fitkenService.consumeForTryOn(userId, previewId);
        assertThat(fitkenService.balance(userId)).isEqualTo(4);

        assertThat(fitkenService.refundTryOn(previewId, "test")).isTrue();
        assertThat(fitkenService.refundTryOn(previewId, "test")).isFalse();
        assertThat(fitkenService.balance(userId)).isEqualTo(5);
        assertThat(fitkenService.refundTryOn(UUID.randomUUID(), "never charged")).isFalse();
    }

    @Test
    void aiTryOnWithEmptyWalletIsRejected() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Broke avatar top", "Áo thun");
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        fitkenService.adminAdjust(principal.getUserId(), -5, "drain for test");
        assertThat(fitkenService.balance(principal.getUserId())).isZero();

        String requestId = createAvatarTryOn(principal, product);
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("FITKEN_INSUFFICIENT"));

        assertThat(fitkenService.balance(principal.getUserId())).isZero();
        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.CONSUME))
                .isZero();
    }

    @Test
    void adminCanAdjustAndInspectWallet() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        UUID userId = testDataHelper.createUser().user().getId();

        mockMvc.perform(post("/api/v1/admin/consumers/{userId}/fitken/adjust", userId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"delta\": 10, \"note\": \"Bồi thường\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/admin/consumers/{userId}/fitken", userId).with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.wallet.balance").value(15));
    }

    private String createAvatarTryOn(FitMeUserPrincipal principal, Product product) throws Exception {
        String body = mockMvc.perform(post("/api/v1/try-on/requests")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"previewMode": "AVATAR", "avatarKey": "avatar-female-1", "heightCm": 165, "weightKg": 55}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(body).get("data").get("id").asText();
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId": "%s", "role": "%s", "selectedSize": "M"}
                                """.formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());
        return requestId;
    }
}
