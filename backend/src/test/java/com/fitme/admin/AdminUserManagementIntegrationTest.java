package com.fitme.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminUserManagementIntegrationTest extends AbstractIntegrationTest {

    private static final String PASSWORD = "Test12345!";

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void adminSearchesAccountsAndLockingSignsTheUserOut() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        String marker = UUID.randomUUID().toString().substring(0, 8);
        String email = "lock-" + marker + "@test.fitme.ai";
        JsonNode session = registerVerifiedUser(email, PASSWORD, "Khách " + marker);
        String access = session.get("accessToken").asText();
        String refresh = session.get("refreshToken").asText();
        String userId = session.get("userId").asText();

        mockMvc.perform(get("/api/v1/admin/users").param("q", marker.toUpperCase()).param("role", "USER")
                        .with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].email").value(email))
                .andExpect(jsonPath("$.data.items[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.summary.totalAccounts").isNumber());
        mockMvc.perform(get("/api/v1/admin/users").param("q", marker).param("role", "ADMIN").with(user(admin)))
                .andExpect(jsonPath("$.data.total").value(0));
        mockMvc.perform(get("/api/v1/admin/users").param("role", "OWNER").with(user(admin)))
                .andExpect(status().isBadRequest());

        setStatus(admin, userId, "SUSPENDED")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"));

        mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", "Bearer " + access))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_LOCKED"));
        login(email, PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_LOCKED"));
        login(email, "Wrong-pass-1").andExpect(status().isUnauthorized());

        setStatus(admin, userId, "ACTIVE")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
        login(email, PASSWORD).andExpect(status().isOk());
    }

    @Test
    void adminsCannotLockThemselvesOrOtherAdmins() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        FitMeUserPrincipal otherAdmin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());

        setStatus(admin, admin.getUserId().toString(), "SUSPENDED").andExpect(status().isBadRequest());
        setStatus(admin, otherAdmin.getUserId().toString(), "SUSPENDED").andExpect(status().isBadRequest());
        setStatus(admin, otherAdmin.getUserId().toString(), "DELETED").andExpect(status().isBadRequest());
    }

    @Test
    void onlyAdminsCanManageAccounts() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        mockMvc.perform(get("/api/v1/admin/users").with(user(consumer)))
                .andExpect(status().isForbidden());
        setStatus(consumer, consumer.getUserId().toString(), "SUSPENDED").andExpect(status().isForbidden());
    }

    private ResultActions setStatus(FitMeUserPrincipal actor, String userId, String status) throws Exception {
        return mockMvc.perform(patch("/api/v1/admin/users/{id}/status", userId)
                .with(user(actor))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"" + status + "\"}"));
    }

    private ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)));
    }
}
