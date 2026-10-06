package com.fitme.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class P0AuthIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Test12345!";

    @Autowired
    private TestDataHelper testDataHelper;

    /** AUTH-LOG-02 */
    @Test
    void login_wrongPasswordForExistingEmail_returns401WithGenericMessage() throws Exception {
        String email = testDataHelper.createUser().user().getEmail();

        login(email, "wrongpass")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("Email hoặc mật khẩu không đúng"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    /** AUTH-TOK-04 (backend part) */
    @Test
    void logout_revokesRefreshToken() throws Exception {
        String email = testDataHelper.createUser().user().getEmail();
        JsonNode session = data(login(email, "test123").andExpect(status().isOk()));
        String refresh = session.get("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk());

        refresh(refresh).andExpect(status().isBadRequest());
    }

    /** AUTH-PWD-14 */
    @Test
    void resetPassword_signsOutOtherDevices() throws Exception {
        String email = "reset-" + UUID.randomUUID() + "@test.fitme.ai";
        JsonNode deviceB = registerVerifiedUser(email, PASSWORD, "Thiết bị B");
        String accessB = deviceB.get("accessToken").asText();
        String refreshB = deviceB.get("refreshToken").asText();
        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + accessB))
                .andExpect(status().isOk());
        // JWT iat has second precision; tokens from the same second as the reset are deliberately still accepted.
        Thread.sleep(1100);

        String resetToken = objectMapper.readTree(mockMvc.perform(get("/api/v1/test/password-reset-token")
                                .param("email", email))
                        .andExpect(status().isOk())
                        .andReturn().getResponse().getContentAsString())
                .get("data").get("token").asText();
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"%s\",\"newPassword\":\"NewPass#2026\"}".formatted(resetToken)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + accessB))
                .andExpect(status().is4xxClientError());
        refresh(refreshB).andExpect(status().isBadRequest());
        login(email, PASSWORD).andExpect(status().isUnauthorized());
        login(email, "NewPass#2026").andExpect(status().isOk());
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    private ResultActions refresh(String refreshToken) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/refresh-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"));
    }

    private JsonNode data(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString()).get("data");
    }
}
