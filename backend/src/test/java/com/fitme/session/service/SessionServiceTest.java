package com.fitme.session.service;

import com.fitme.AbstractIntegrationTest;
import com.fitme.userprofile.repository.BodyProfileRepository;
import com.fitme.userprofile.repository.StyleProfileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SessionServiceTest extends AbstractIntegrationTest {

    @Autowired
    private BodyProfileRepository bodyProfileRepository;

    @Autowired
    private StyleProfileRepository styleProfileRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    @Test
    void linkToUser_migratesSessionDataToUser() throws Exception {
        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 172, "weightKg": 68, "gender": "FEMALE", "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"primaryStyle": "Streetwear", "preferredColors": ["Black"]}
                                """))
                .andExpect(status().isOk());

        var auth = registerVerifiedUser(
                "migrate-test-%s@fitme.ai".formatted(System.nanoTime()),
                "fitme123",
                "Migrate Test");
        String accessToken = auth.get("accessToken").asText();

        mockMvc.perform(post("/api/v1/sessions/link-to-user")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionToken": "%s"}
                                """.formatted(sessionToken)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/me/body-profile")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/me/style-profile")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        var userId = auth.get("userId").asText();
        assertFalse(bodyProfileRepository.findByUserId(java.util.UUID.fromString(userId)).isEmpty());
        assertFalse(styleProfileRepository.findByUserId(java.util.UUID.fromString(userId)).isEmpty());
    }

    @Test
    void linkToUser_neverTakesDataAlreadyOwnedByAnotherUser() throws Exception {
        String sessionToken = createAnonymousSessionToken();
        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 165, "weightKg": 55, "gender": "FEMALE", "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        var first = registerVerifiedUser("link-first-%s@fitme.ai".formatted(System.nanoTime()), "fitme123", "First");
        var second = registerVerifiedUser("link-second-%s@fitme.ai".formatted(System.nanoTime()), "fitme123", "Second");
        java.util.UUID firstUserId = java.util.UUID.fromString(first.get("userId").asText());
        java.util.UUID secondUserId = java.util.UUID.fromString(second.get("userId").asText());

        linkSession(first.get("accessToken").asText(), sessionToken);
        assertFalse(bodyProfileRepository.findByUserId(firstUserId).isEmpty());

        // Same browser, next account: the already-linked session must not hand over the first user's data.
        linkSession(second.get("accessToken").asText(), sessionToken);
        assertFalse(bodyProfileRepository.findByUserId(firstUserId).isEmpty());
        assertTrue(bodyProfileRepository.findByUserId(secondUserId).isEmpty());
        assertEquals(firstUserId, jdbc.queryForObject(
                "SELECT linked_user_id FROM anonymous_sessions WHERE session_token = ?",
                java.util.UUID.class, sessionToken));

        // An unlinked session whose rows were written while another user was logged in keeps those owners.
        String sharedToken = createAnonymousSessionToken();
        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sharedToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"primaryStyle": "Minimal"}
                                """))
                .andExpect(status().isOk());
        jdbc.update("""
                UPDATE style_profiles SET user_id = ?
                WHERE session_id = (SELECT id FROM anonymous_sessions WHERE session_token = ?)
                """, firstUserId, sharedToken);

        linkSession(second.get("accessToken").asText(), sharedToken);
        assertTrue(styleProfileRepository.findByUserId(secondUserId).isEmpty());
        assertFalse(styleProfileRepository.findByUserId(firstUserId).isEmpty());
    }

    private void linkSession(String accessToken, String sessionToken) throws Exception {
        mockMvc.perform(post("/api/v1/sessions/link-to-user")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionToken": "%s"}
                                """.formatted(sessionToken)))
                .andExpect(status().isOk());
    }
}
