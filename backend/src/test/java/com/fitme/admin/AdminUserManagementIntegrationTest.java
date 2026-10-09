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

    @Test
    void adminHandsABrandAccountOverWithANewEmailAndPassword() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        TestDataHelper.BrandOwnerContext owner = testDataHelper.createBrandOwner();
        String userId = owner.user().getId().toString();
        String newEmail = "Real-Owner-" + UUID.randomUUID().toString().substring(0, 8) + "@Brand.test";

        setCredentials(admin, userId, "{\"email\":\"%s\",\"password\":\"Handover-2026\"}".formatted(newEmail))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(newEmail.toLowerCase()))
                .andExpect(jsonPath("$.data.emailVerified").value(true))
                .andExpect(jsonPath("$.data.brandName").value(owner.brand().getName()));

        login(newEmail.toLowerCase(), "Handover-2026").andExpect(status().isOk());
        login(owner.user().getEmail(), "test123").andExpect(status().isUnauthorized());

        setCredentials(admin, userId, "{\"password\":\"Second-pass-1\"}").andExpect(status().isOk());
        login(newEmail.toLowerCase(), "Second-pass-1").andExpect(status().isOk());
        login(newEmail.toLowerCase(), "Handover-2026").andExpect(status().isUnauthorized());
    }

    @Test
    void credentialChangesAreValidated() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        String userId = testDataHelper.createBrandOwner().user().getId().toString();
        String takenEmail = testDataHelper.createUser().user().getEmail();
        String otherAdminId = testDataHelper.createAdmin().user().getId().toString();

        setCredentials(admin, userId, "{}").andExpect(status().isBadRequest());
        setCredentials(admin, userId, "{\"password\":\"short\"}").andExpect(status().isBadRequest());
        setCredentials(admin, userId, "{\"email\":\"not-an-email\"}").andExpect(status().isBadRequest());
        setCredentials(admin, userId, "{\"email\":\"%s\"}".formatted(takenEmail.toUpperCase()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("EMAIL_TAKEN"));
        setCredentials(admin, otherAdminId, "{\"password\":\"Takeover-123\"}").andExpect(status().isBadRequest());
        setCredentials(admin, UUID.randomUUID().toString(), "{\"password\":\"Whatever-123\"}")
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyAdminsCanChangeCredentials() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testDataHelper.createBrandOwner();
        FitMeUserPrincipal brand = new FitMeUserPrincipal(owner.user());
        setCredentials(brand, owner.user().getId().toString(), "{\"password\":\"Self-service-1\"}")
                .andExpect(status().isForbidden());
    }

    private ResultActions setCredentials(FitMeUserPrincipal actor, String userId, String body) throws Exception {
        return mockMvc.perform(patch("/api/v1/admin/users/{id}/credentials", userId)
                .with(user(actor))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
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
