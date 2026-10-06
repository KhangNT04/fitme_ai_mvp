package com.fitme.auth.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.support.TestDataHelper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void register_requiresVerificationThenIssuesTokens() throws Exception {
        String email = "newuser-" + java.util.UUID.randomUUID() + "@test.fitme.ai";

        MvcResult captchaResult = mockMvc.perform(get("/api/v1/auth/captcha"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.captchaId").isNotEmpty())
                .andExpect(jsonPath("$.data.question").isNotEmpty())
                .andReturn();
        String captchaId = JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.captchaId");
        String question = JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.question");
        int answer = parseCaptchaAnswer(question);

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test1234","fullName":"New User","website":"","captchaId":"%s","captchaAnswer":"%d","formStartedAtMs":%d}
                                """.formatted(email, captchaId, answer, System.currentTimeMillis() - 5000)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requiresEmailVerification").value(true))
                .andExpect(jsonPath("$.data.verificationCode").isNotEmpty())
                .andReturn();

        String code = JsonPath.read(registerResult.getResponse().getContentAsString(), "$.data.verificationCode");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test1234"}
                                """.formatted(email)))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(post("/api/v1/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","token":"%s"}
                                """.formatted(email, code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.emailVerified").value(true));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test1234"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void register_rejectsHoneypot() throws Exception {
        MvcResult captchaResult = mockMvc.perform(get("/api/v1/auth/captcha"))
                .andExpect(status().isOk())
                .andReturn();
        String captchaId = JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.captchaId");
        String question = JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.question");
        int answer = parseCaptchaAnswer(question);
        String email = "bot-" + java.util.UUID.randomUUID() + "@test.fitme.ai";

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test1234","fullName":"Bot","website":"https://spam.example","captchaId":"%s","captchaAnswer":"%d","formStartedAtMs":%d}
                                """.formatted(email, captchaId, answer, System.currentTimeMillis() - 5000)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void login_validCredentials_returnsTokens() throws Exception {
        TestDataHelper.UserContext ctx = testDataHelper.createUser();
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"test123"}
                                """.formatted(ctx.user().getEmail())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void login_locksEmailAfterFiveWrongPasswords() throws Exception {
        TestDataHelper.UserContext ctx = testDataHelper.createUser();
        String wrong = "{\"email\":\"%s\",\"password\":\"wrong-pass\"}".formatted(ctx.user().getEmail());
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isUnauthorized());
        }
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"test123\"}".formatted(ctx.user().getEmail())))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("LOGIN_LOCKED"));
    }

    @Test
    void refreshToken_isRotatedAndOldTokenRejected() throws Exception {
        TestDataHelper.UserContext ctx = testDataHelper.createUser();
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"test123\"}".formatted(ctx.user().getEmail())))
                .andExpect(status().isOk())
                .andReturn();
        String first = JsonPath.read(login.getResponse().getContentAsString(), "$.data.refreshToken");

        MvcResult refreshed = mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(first)))
                .andExpect(status().isOk())
                .andReturn();
        String second = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.data.refreshToken");
        org.assertj.core.api.Assertions.assertThat(second).isNotEqualTo(first);

        mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(first)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"%s\"}".formatted(second)))
                .andExpect(status().isOk());
    }

    @Test
    void resendVerification_doesNotRevealWhetherEmailExists() throws Exception {
        TestDataHelper.UserContext verified = testDataHelper.createUser();
        String unknown = "ghost-" + java.util.UUID.randomUUID() + "@test.fitme.ai";

        MvcResult forUnknown = mockMvc.perform(post("/api/v1/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(unknown)))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult forVerified = mockMvc.perform(post("/api/v1/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(verified.user().getEmail())))
                .andExpect(status().isOk())
                .andReturn();
        String unknownMessage = JsonPath.read(forUnknown.getResponse().getContentAsString(), "$.data.message");
        String verifiedMessage = JsonPath.read(forVerified.getResponse().getContentAsString(), "$.data.message");
        org.assertj.core.api.Assertions.assertThat(unknownMessage).isEqualTo(verifiedMessage);

        mockMvc.perform(post("/api/v1/auth/resend-verification")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\"}".formatted(unknown)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_rejectsOverlongNameAndPassword() throws Exception {
        String longName = "N".repeat(101);
        String longPassword = "p".repeat(101);
        for (String[] fields : new String[][] {{longName, "test1234"}, {"Ok Name", longPassword}}) {
            MvcResult captchaResult = mockMvc.perform(get("/api/v1/auth/captcha")).andReturn();
            String captchaId = JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.captchaId");
            int answer = parseCaptchaAnswer(
                    JsonPath.read(captchaResult.getResponse().getContentAsString(), "$.data.question"));
            String email = "long-" + java.util.UUID.randomUUID() + "@test.fitme.ai";
            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"email":"%s","password":"%s","fullName":"%s","website":"","captchaId":"%s","captchaAnswer":"%d","formStartedAtMs":%d}
                                    """.formatted(email, fields[1], fields[0], captchaId, answer,
                                    System.currentTimeMillis() - 5000)))
                    .andExpect(status().isBadRequest());
        }
    }
}
