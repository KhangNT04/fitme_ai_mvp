package com.fitme.privacy.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PrivacyErasureIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void withdrawnConsent_isNoLongerCounted() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        recordConsent(principal, true);
        mockMvc.perform(get("/api/v1/privacy/consent").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.PHOTO_UPLOAD").value(true));

        recordConsent(principal, false);
        mockMvc.perform(get("/api/v1/privacy/consent").with(user(principal)))
                .andExpect(jsonPath("$.data.PHOTO_UPLOAD").value(false));
    }

    @Test
    void processingUnknownDeletionRequest_isNotFound() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(post("/api/v1/admin/privacy/deletion-requests/{id}/process", UUID.randomUUID())
                        .with(user(admin)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteAll_erasesPersonalDataAndDisablesAccount() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        UUID userId = account.getId();
        String originalEmail = account.getEmail();
        jdbc.update("INSERT INTO body_profiles (user_id, height_cm, weight_kg) VALUES (?, 170, 60)", userId);
        jdbc.update("INSERT INTO wardrobe_items (user_id, name) VALUES (?, 'Áo thun')", userId);
        jdbc.update("""
                INSERT INTO shipping_addresses (user_id, recipient_name, phone, province, district, ward, street)
                VALUES (?, 'A', '0900000000', 'HCM', 'Q1', 'P1', '1 Le Loi')
                """, userId);

        String requestId = requestDeletion(new FitMeUserPrincipal(account), "ALL");
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(post("/api/v1/admin/privacy/deletion-requests/{id}/process", requestId).with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        for (String table : new String[] {"body_profiles", "wardrobe_items", "shipping_addresses"}) {
            Integer left = jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE user_id = ?", Integer.class, userId);
            assertThat(left).as(table).isZero();
        }
        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, userId))
                .isEqualTo("DELETED");
        assertThat(jdbc.queryForObject("SELECT email FROM user_accounts WHERE id = ?", String.class, userId))
                .isNotEqualTo(originalEmail);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"test123\"}".formatted(originalEmail)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void deleteWardrobe_onlyRemovesWardrobe() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        UUID userId = account.getId();
        jdbc.update("INSERT INTO body_profiles (user_id, height_cm, weight_kg) VALUES (?, 170, 60)", userId);
        jdbc.update("INSERT INTO wardrobe_items (user_id, name) VALUES (?, 'Quần jean')", userId);

        String requestId = requestDeletion(new FitMeUserPrincipal(account), "WARDROBE");
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(post("/api/v1/admin/privacy/deletion-requests/{id}/process", requestId).with(user(admin)))
                .andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM wardrobe_items WHERE user_id = ?", Integer.class, userId)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM body_profiles WHERE user_id = ?", Integer.class, userId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, userId)).isEqualTo("ACTIVE");
    }

    @Test
    void deleteAll_forBrandOwner_requiresManualReview() throws Exception {
        UserAccount owner = testDataHelper.createBrandOwner().user();
        String requestId = requestDeletion(new FitMeUserPrincipal(owner), "ALL");
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(post("/api/v1/admin/privacy/deletion-requests/{id}/process", requestId).with(user(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("DELETION_MANUAL_REVIEW"));
        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, owner.getId()))
                .isEqualTo("ACTIVE");
    }

    private void recordConsent(FitMeUserPrincipal principal, boolean accepted) throws Exception {
        mockMvc.perform(post("/api/v1/privacy/consent")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"consentType\":\"PHOTO_UPLOAD\",\"accepted\":%s}".formatted(accepted)))
                .andExpect(status().isOk());
    }

    private String requestDeletion(FitMeUserPrincipal principal, String type) throws Exception {
        String body = mockMvc.perform(post("/api/v1/privacy/deletion-requests")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestType\":\"%s\"}".formatted(type)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.data.id");
    }
}
