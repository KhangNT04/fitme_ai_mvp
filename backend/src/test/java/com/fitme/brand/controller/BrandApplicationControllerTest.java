package com.fitme.brand.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.enums.UserRole;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BrandApplicationControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Test
    void apply_asUser_createsPendingBrand() throws Exception {
        TestDataHelper.UserContext ctx = testDataHelper.createUser();
        FitMeUserPrincipal principal = new FitMeUserPrincipal(ctx.user());

        mockMvc.perform(post("/api/v1/brand/applications")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "New Fashion Co %s",
                                  "contactEmail": "%s",
                                  "websiteUrl": "https://example.com"
                                }
                                """.formatted(UUID.randomUUID(), ctx.user().getEmail())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        mockMvc.perform(get("/api/v1/brand/applications/me")
                        .with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hasApplication").value(true));
    }

    @Test
    void approveBrand_elevatesUserRole() throws Exception {
        TestDataHelper.UserContext ctx = testDataHelper.createUser();
        FitMeUserPrincipal userPrincipal = new FitMeUserPrincipal(ctx.user());
        TestDataHelper.AdminContext admin = testDataHelper.createAdmin();
        FitMeUserPrincipal adminPrincipal = new FitMeUserPrincipal(admin.user());

        String applyResponse = mockMvc.perform(post("/api/v1/brand/applications")
                        .with(user(userPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "Elevate Brand %s", "contactEmail": "%s"}
                                """.formatted(UUID.randomUUID(), ctx.user().getEmail())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String brandId = objectMapper.readTree(applyResponse).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/admin/brands/{id}/approve", brandId)
                        .with(user(adminPrincipal)))
                .andExpect(status().isOk());

        UserAccount updated = userAccountRepository.findById(ctx.user().getId()).orElseThrow();
        assertThat(updated.getRole()).isEqualTo(UserRole.BRAND_OWNER);
    }

    @Test
    void brandNamesAreUniqueIgnoringCase() throws Exception {
        TestDataHelper.BrandOwnerContext existing = testDataHelper.createBrandOwner();
        String takenName = existing.brand().getName();

        TestDataHelper.UserContext applicant = testDataHelper.createUser();
        mockMvc.perform(post("/api/v1/brand/applications")
                        .with(user(new FitMeUserPrincipal(applicant.user())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "  %s ", "contactEmail": "%s"}
                                """.formatted(takenName.toUpperCase(), applicant.user().getEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_NAME_TAKEN"));

        TestDataHelper.BrandOwnerContext other = testDataHelper.createBrandOwner();
        FitMeUserPrincipal otherOwner = new FitMeUserPrincipal(other.user());
        mockMvc.perform(put("/api/v1/brand/me")
                        .with(user(otherOwner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"%s\"}".formatted(takenName.toLowerCase())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_NAME_TAKEN"));
        mockMvc.perform(put("/api/v1/brand/me")
                        .with(user(otherOwner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"%s\"}".formatted(other.brand().getName().toUpperCase())))
                .andExpect(status().isOk());
    }
}
