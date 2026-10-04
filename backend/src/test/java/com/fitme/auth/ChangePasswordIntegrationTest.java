package com.fitme.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChangePasswordIntegrationTest extends AbstractIntegrationTest {

    private static final String OLD = "Test12345!";
    private static final String NEW = "NewPass#2026";

    @Test
    void changePassword_rotatesTokens_andSignsOutOtherSessions() throws Exception {
        String email = "pwd-" + UUID.randomUUID() + "@test.fitme.ai";
        JsonNode session = registerVerifiedUser(email, OLD, "Đổi Mật Khẩu");
        String oldAccess = session.get("accessToken").asText();
        String oldRefresh = session.get("refreshToken").asText();
        // JWT iat has second precision; tokens from the same second as the change are deliberately still accepted.
        Thread.sleep(1100);

        change(oldAccess, "Sai-mat-khau-1", NEW, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Mật khẩu hiện tại không đúng"));
        change(oldAccess, OLD, OLD, null).andExpect(status().isBadRequest());
        change(oldAccess, OLD, "short", null).andExpect(status().isBadRequest());

        JsonNode rotated = objectMapper.readTree(change(oldAccess, OLD, NEW, oldRefresh)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data");
        String newAccess = rotated.get("accessToken").asText();
        assertThat(newAccess).isNotEqualTo(oldAccess);

        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + oldAccess))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + newAccess))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + oldRefresh + "\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + rotated.get("refreshToken").asText() + "\"}"))
                .andExpect(status().isOk());

        login(email, OLD).andExpect(status().is4xxClientError());
        login(email, NEW).andExpect(status().isOk());
    }

    @Test
    void changePassword_requiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/v1/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"a\",\"newPassword\":\"" + NEW + "\"}"))
                .andExpect(status().is4xxClientError());
    }

    private ResultActions change(String accessToken, String current, String next, String refreshToken)
            throws Exception {
        String refresh = refreshToken == null ? "" : ",\"refreshToken\":\"" + refreshToken + "\"";
        return mockMvc.perform(post("/api/v1/me/password")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"currentPassword\":\"%s\",\"newPassword\":\"%s\"%s}".formatted(current, next, refresh)));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }
}
