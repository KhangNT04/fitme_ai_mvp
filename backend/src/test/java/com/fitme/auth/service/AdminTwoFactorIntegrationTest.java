package com.fitme.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.config.FitMeProperties;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminTwoFactorIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "test123";

    /** Same context as the other mail-spying tests; also keeps 2FA emails off the network. */
    @SpyBean
    private AuthEmailService mail;

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private TotpService totp;

    @Autowired
    private FitMeProperties properties;

    @Test
    void adminEnrollsSignsInWithACodeAndTheAdminPortalRequiresIt() throws Exception {
        UserAccount admin = testDataHelper.createAdmin().user();
        String passwordOnly = data(login(admin.getEmail(), PASSWORD).andExpect(status().isOk()))
                .get("accessToken").asText();

        mockMvc.perform(get("/api/v1/me/2fa").header("Authorization", bearer(passwordOnly)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled").value(false))
                .andExpect(jsonPath("$.data.available").value(true))
                .andExpect(jsonPath("$.data.sessionVerified").value(false));

        String secret = data(mockMvc.perform(post("/api/v1/me/2fa/setup").header("Authorization", bearer(passwordOnly)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.otpauthUri").value(org.hamcrest.Matchers.startsWith("otpauth://totp/")))
        ).get("secret").asText();
        // JWT iat has second precision; enabling 2FA ends sessions issued before it.
        Thread.sleep(1100);

        twoFactor(passwordOnly, "enable", PASSWORD, "000000").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MFA_CODE_INVALID"));
        twoFactor(passwordOnly, "enable", "wrong-password", code(secret, 0)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_INCORRECT"));
        JsonNode enabled = data(twoFactor(passwordOnly, "enable", PASSWORD, code(secret, 0))
                .andExpect(status().isOk()));
        assertThat(enabled.get("recoveryCodes")).hasSize(10);
        String enrolledSession = enabled.get("session").get("accessToken").asText();

        mockMvc.perform(get("/api/v1/me/2fa").header("Authorization", bearer(passwordOnly)))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(get("/api/v1/me/2fa").header("Authorization", bearer(enrolledSession)))
                .andExpect(jsonPath("$.data.enabled").value(true))
                .andExpect(jsonPath("$.data.sessionVerified").value(true))
                .andExpect(jsonPath("$.data.recoveryCodesRemaining").value(10));

        JsonNode challenge = data(login(admin.getEmail(), PASSWORD).andExpect(status().isOk()));
        assertThat(challenge.get("requiresTwoFactor").asBoolean()).isTrue();
        assertThat(challenge.get("accessToken").isNull()).isTrue();
        String challengeToken = challenge.get("twoFactorToken").asText();

        loginWithCode(challengeToken, "000000").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("MFA_CODE_INVALID"));
        String nextCode = code(secret, 1);
        JsonNode signedIn = data(loginWithCode(challengeToken, nextCode).andExpect(status().isOk()));
        loginWithCode(challengeToken, nextCode).andExpect(status().isBadRequest());
        String mfaAccess = signedIn.get("accessToken").asText();

        UserAccount otherAdmin = testDataHelper.createAdmin().user();
        String otherAdminAccess = data(login(otherAdmin.getEmail(), PASSWORD)).get("accessToken").asText();
        properties.getAuth().setAdminMfaRequired(true);
        try {
            mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(otherAdminAccess)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.errorCode").value("ADMIN_MFA_REQUIRED"));
            mockMvc.perform(get("/api/v1/me/2fa").header("Authorization", bearer(otherAdminAccess)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.required").value(true));
            mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(mfaAccess)))
                    .andExpect(status().isOk());

            String refreshed = data(mockMvc.perform(post("/api/v1/auth/refresh-token")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"refreshToken\":\"" + signedIn.get("refreshToken").asText() + "\"}"))
                    .andExpect(status().isOk())).get("accessToken").asText();
            mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(refreshed)))
                    .andExpect(status().isOk());

            String recoveryCode = enabled.get("recoveryCodes").get(0).asText();
            twoFactor(mfaAccess, "disable", PASSWORD, recoveryCode).andExpect(status().isOk());
            mockMvc.perform(get("/api/v1/admin/users").header("Authorization", bearer(mfaAccess)))
                    .andExpect(status().isForbidden());
        } finally {
            properties.getAuth().setAdminMfaRequired(false);
        }

        data(login(admin.getEmail(), PASSWORD).andExpect(status().isOk()))
                .get("accessToken").asText();
        mockMvc.perform(get("/api/v1/admin/audit-log")
                        .param("targetUserId", admin.getId().toString())
                        .header("Authorization", bearer(mfaAccess)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].action").value("ADMIN_SIGN_IN"))
                .andExpect(jsonPath("$.data.items[0].details").value("Mật khẩu (chưa bật 2FA)"))
                .andExpect(jsonPath("$.data.items[1].action").value("MFA_DISABLED"))
                .andExpect(jsonPath("$.data.items[2].action").value("ADMIN_SIGN_IN"))
                .andExpect(jsonPath("$.data.items[2].details").value("Mật khẩu + mã Authenticator"))
                .andExpect(jsonPath("$.data.items[3].action").value("MFA_ENABLED"));
    }

    @Test
    void recoveryCodeSignsInOnceAndOnlyAdminsCanEnroll() throws Exception {
        UserAccount admin = testDataHelper.createAdmin().user();
        String access = data(login(admin.getEmail(), PASSWORD)).get("accessToken").asText();
        String secret = data(mockMvc.perform(post("/api/v1/me/2fa/setup").header("Authorization", bearer(access))))
                .get("secret").asText();
        String recoveryCode = data(twoFactor(access, "enable", PASSWORD, code(secret, 0)).andExpect(status().isOk()))
                .get("recoveryCodes").get(3).asText();

        String challenge = data(login(admin.getEmail(), PASSWORD)).get("twoFactorToken").asText();
        loginWithCode(challenge, recoveryCode.toUpperCase()).andExpect(status().isOk());
        String again = data(login(admin.getEmail(), PASSWORD)).get("twoFactorToken").asText();
        loginWithCode(again, recoveryCode).andExpect(status().isBadRequest());

        String consumer = registerUserAccessToken();
        mockMvc.perform(post("/api/v1/me/2fa/setup").header("Authorization", bearer(consumer)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/me/2fa").header("Authorization", bearer(consumer)))
                .andExpect(jsonPath("$.data.available").value(false));
        mockMvc.perform(get("/api/v1/me/2fa")).andExpect(status().is4xxClientError());
    }

    private String code(String secret, int stepsAhead) {
        return totp.codeAt(secret, totp.currentStep() + stepsAhead);
    }

    private ResultActions twoFactor(String access, String action, String password, String code) throws Exception {
        return mockMvc.perform(post("/api/v1/me/2fa/" + action)
                .header("Authorization", bearer(access))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"%s\",\"code\":\"%s\"}".formatted(password, code)));
    }

    private ResultActions loginWithCode(String challengeToken, String code) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login/2fa")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"twoFactorToken\":\"%s\",\"code\":\"%s\"}".formatted(challengeToken, code)));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    private JsonNode data(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}
