package com.fitme.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.service.AuthEmailService;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminAccountSecurityIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Test12345!";

    @SpyBean
    private AuthEmailService mail;

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void adminCannotSetAConsumerPasswordButCanSendAResetLink() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        String email = "reset-" + UUID.randomUUID().toString().substring(0, 8) + "@test.fitme.ai";
        String userId = registerVerifiedUser(email, PASSWORD, "Khách").get("userId").asText();
        doNothing().when(mail).sendPasswordResetLink(anyString(), anyString(), anyInt());

        setCredentials(admin, userId, "{\"password\":\"Takeover-123\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_SET_NOT_ALLOWED"));
        login(email, "Takeover-123").andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/admin/users/{id}/password-reset-link", userId).with(user(admin)))
                .andExpect(status().isOk());
        verify(mail).sendPasswordResetLink(eq(email), anyString(), eq(60));
        mockMvc.perform(post("/api/v1/admin/users/{id}/password-reset-link", userId).with(user(admin)))
                .andExpect(status().isBadRequest());
        login(email, PASSWORD).andExpect(status().isOk());

        auditFor(admin, userId)
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].action").value("USER_PASSWORD_RESET_LINK_SENT"))
                .andExpect(jsonPath("$.data.items[0].actorEmail").value(admin.getEmail()))
                .andExpect(jsonPath("$.data.items[0].targetEmail").value(email));
    }

    @Test
    void adminEmailChangeSignsTheOwnerOutAndNotifiesBothAddresses() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        String marker = UUID.randomUUID().toString().substring(0, 8);
        String oldEmail = "old-" + marker + "@test.fitme.ai";
        String newEmail = "new-" + marker + "@test.fitme.ai";
        JsonNode session = registerVerifiedUser(oldEmail, PASSWORD, "Khách " + marker);
        String userId = session.get("userId").asText();
        // JWT iat has second precision; tokens from the same second as the change are deliberately still accepted.
        Thread.sleep(1100);

        setCredentials(admin, userId, "{\"email\":\"%s\"}".formatted(newEmail))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(newEmail));

        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + session.get("accessToken").asText()))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + session.get("refreshToken").asText() + "\"}"))
                .andExpect(status().isBadRequest());
        login(oldEmail, PASSWORD).andExpect(status().isUnauthorized());
        login(newEmail, PASSWORD).andExpect(status().isOk());

        verify(mail, timeout(5000)).sendNotification(eq(oldEmail), contains("Email đăng nhập"),
                contains(oldEmail), anyString(), eq("account security"));
        verify(mail, timeout(5000)).sendNotification(eq(newEmail), anyString(),
                contains(newEmail), anyString(), eq("account security"));

        auditFor(admin, userId)
                .andExpect(jsonPath("$.data.items[0].action").value("USER_EMAIL_CHANGED"))
                .andExpect(jsonPath("$.data.items[0].details").value(oldEmail + " → " + newEmail));
    }

    @Test
    void brandHandoverPasswordSignsOutAndNotifies() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        TestDataHelper.BrandOwnerContext owner = testDataHelper.createBrandOwner();
        String email = owner.user().getEmail();
        String access = data(login(email, "test123").andExpect(status().isOk())).get("accessToken").asText();
        Thread.sleep(1100);

        setCredentials(admin, owner.user().getId().toString(), "{\"password\":\"Handover-2026\"}")
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/brand/products").header("Authorization", "Bearer " + access))
                .andExpect(status().is4xxClientError());
        login(email, "Handover-2026").andExpect(status().isOk());
        verify(mail, timeout(5000)).sendNotification(eq(email), contains("mật khẩu mới"), anyString(), anyString(),
                eq("account security"));
        auditFor(admin, owner.user().getId().toString())
                .andExpect(jsonPath("$.data.items[0].action").value("USER_PASSWORD_SET"));
    }

    @Test
    void passwordResetAndChangeNotifyTheOwnerAndNeedEightCharacters() throws Exception {
        String email = "notify-" + UUID.randomUUID().toString().substring(0, 8) + "@test.fitme.ai";
        String access = registerVerifiedUser(email, PASSWORD, "Khách").get("accessToken").asText();

        mockMvc.perform(post("/api/v1/me/password")
                        .header("Authorization", "Bearer " + access)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"%s\",\"newPassword\":\"Changed-2026\"}".formatted(PASSWORD)))
                .andExpect(status().isOk());
        verify(mail, timeout(5000)).sendNotification(eq(email), contains("vừa được thay đổi"), anyString(),
                anyString(), eq("account security"));

        String resetToken = data(mockMvc.perform(get("/api/v1/test/password-reset-token").param("email", email))
                .andExpect(status().isOk())).get("token").asText();
        resetPassword(resetToken, "short7!").andExpect(status().isBadRequest());
        resetPassword(resetToken, "Reset-2026").andExpect(status().isOk());
        verify(mail, timeout(5000)).sendNotification(eq(email), contains("vừa được đặt lại"), anyString(),
                anyString(), eq("account security"));
    }

    @Test
    void onlyAdminsCanReadTheAuditLog() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        mockMvc.perform(get("/api/v1/admin/audit-log").with(user(consumer))).andExpect(status().isForbidden());
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(get("/api/v1/admin/audit-log").param("action", "NOPE").with(user(admin)))
                .andExpect(status().isBadRequest());
    }

    private ResultActions auditFor(FitMeUserPrincipal admin, String userId) throws Exception {
        return mockMvc.perform(get("/api/v1/admin/audit-log").param("targetUserId", userId).with(user(admin)))
                .andExpect(status().isOk());
    }

    private ResultActions setCredentials(FitMeUserPrincipal actor, String userId, String body) throws Exception {
        return mockMvc.perform(patch("/api/v1/admin/users/{id}/credentials", userId)
                .with(user(actor))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions resetPassword(String token, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"newPassword\":\"%s\"}".formatted(token, password)));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }

    private JsonNode data(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
    }
}
