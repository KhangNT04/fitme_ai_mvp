package com.fitme.auth.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.support.TestDataHelper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthEmailSecurityTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void verifyEmail_onVerifiedAccount_neverIssuesTokens() throws Exception {
        String email = testDataHelper.createUser().user().getEmail();

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","token":"000000"}
                                """.formatted(email)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void malformedJsonBody_returnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":broken"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyEmail_requiresEmail() throws Exception {
        String email = "pending-" + UUID.randomUUID() + "@test.fitme.ai";
        String code = registerPendingUser(email, "Test12345!", "Pending");

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s"}
                                """.formatted(code)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verifyEmail_tooManyWrongCodes_burnsTheCode() throws Exception {
        String email = "pending-" + UUID.randomUUID() + "@test.fitme.ai";
        String code = registerPendingUser(email, "Test12345!", "Pending");
        String wrong = code.equals("111111") ? "222222" : "111111";

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/verify-email")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"email":"%s","token":"%s"}
                                    """.formatted(email, wrong)))
                    .andExpect(status().isBadRequest());
        }

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","token":"%s"}
                                """.formatted(email, code)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resetPassword_tokenWorksOnceAndOldPasswordStopsWorking() throws Exception {
        TestDataHelper.UserContext ctx = testDataHelper.createUser();
        String email = ctx.user().getEmail();

        String body = mockMvc.perform(get("/api/v1/test/password-reset-token").param("email", email))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String token = JsonPath.read(body, "$.data.token");

        String resetBody = """
                {"token":"%s","newPassword":"NewPass123!"}
                """.formatted(token);
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resetBody))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"NewPass123!"}
                                """.formatted(email)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test123"}
                                """.formatted(email)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void resetPassword_rejectsAccessTokenAsResetToken() throws Exception {
        String accessToken = registerUserAccessToken();

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"token":"%s","newPassword":"NewPass123!"}
                                """.formatted(accessToken)))
                .andExpect(status().isBadRequest());
    }
}
