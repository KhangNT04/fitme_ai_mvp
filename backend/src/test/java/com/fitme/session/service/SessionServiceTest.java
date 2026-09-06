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
}
