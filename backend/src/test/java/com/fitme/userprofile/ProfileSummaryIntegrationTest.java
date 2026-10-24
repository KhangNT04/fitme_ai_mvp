package com.fitme.userprofile;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProfileSummaryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void summary_reportsCompletionAndCounters() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        FitMeUserPrincipal principal = new FitMeUserPrincipal(account);
        UUID userId = account.getId();

        // createUser() already verified the email, so 1 of 5 checklist steps is done.
        mockMvc.perform(get("/api/v1/me/profile-summary").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bodyProfileComplete").value(false))
                .andExpect(jsonPath("$.data.emailVerified").value(true))
                .andExpect(jsonPath("$.data.galleryImages").value(0))
                .andExpect(jsonPath("$.data.completionRatio").value(0.2))
                .andExpect(jsonPath("$.data.nextStep").value("BODY_PROFILE"));

        jdbc.update("INSERT INTO body_profiles (user_id, height_cm, weight_kg) VALUES (?, 170, 60)", userId);
        jdbc.update("INSERT INTO wardrobe_items (user_id, name) VALUES (?, 'Áo thun')", userId);

        mockMvc.perform(get("/api/v1/me/profile-summary").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bodyProfileComplete").value(true))
                .andExpect(jsonPath("$.data.measurementsComplete").value(true))
                .andExpect(jsonPath("$.data.wardrobeItems").value(1))
                .andExpect(jsonPath("$.data.completionRatio").value(0.6))
                .andExpect(jsonPath("$.data.nextStep").value("STYLE_PROFILE"));
    }

    @Test
    void summary_requiresLogin() throws Exception {
        mockMvc.perform(get("/api/v1/me/profile-summary")).andExpect(status().is4xxClientError());
    }

    @Test
    void displayName_canBeChangedInline() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());

        mockMvc.perform(put("/api/v1/me/display-name")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"  Nguyễn Văn An  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("Nguyễn Văn An"));

        // A blank name is rejected.
        mockMvc.perform(put("/api/v1/me/display-name")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"   \"}"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void erasingPhotos_removesCommunityPosts() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        UUID userId = account.getId();
        jdbc.update("""
                INSERT INTO community_posts (user_id, share_code, image_url, visibility)
                VALUES (?, 'testcode1234', '/uploads/x.png', 'PUBLIC')
                """, userId);
        jdbc.update("INSERT INTO community_post_saves (post_id, user_id) "
                + "SELECT id, ? FROM community_posts WHERE user_id = ?", userId, userId);

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM community_posts WHERE user_id = ?", Integer.class, userId)).isEqualTo(1);

        String requestId = objectMapper.readTree(mockMvc.perform(post("/api/v1/privacy/deletion-requests")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestType\":\"PHOTO_UPLOAD\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(post("/api/v1/admin/privacy/deletion-requests/{id}/process", requestId).with(user(admin)))
                .andExpect(status().isOk());

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM community_posts WHERE user_id = ?", Integer.class, userId)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM community_post_saves WHERE user_id = ?", Integer.class, userId)).isZero();
    }
}
