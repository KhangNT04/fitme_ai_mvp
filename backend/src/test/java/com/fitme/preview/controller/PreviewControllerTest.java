package com.fitme.preview.controller;

import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PreviewControllerTest extends AbstractIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void cannotCreatePreviewFromAnotherGuestsPhoto() throws Exception {
        String ownerToken = createAnonymousSessionToken();
        String strangerToken = createAnonymousSessionToken();
        UUID photoId = insertPhoto(ownerToken);

        mockMvc.perform(post("/api/v1/previews")
                        .header(SESSION_HEADER, strangerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewBody(photoId)))
                .andExpect(status().isBadRequest());

        jdbc.update("UPDATE user_photo_uploads SET deleted_at = NOW() WHERE id = ?", photoId);
        mockMvc.perform(post("/api/v1/previews")
                        .header(SESSION_HEADER, ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewBody(photoId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void photoOnlyPreviewIsVisibleToItsOwnerOnly() throws Exception {
        String ownerToken = createAnonymousSessionToken();
        String strangerToken = createAnonymousSessionToken();
        UUID photoId = insertPhoto(ownerToken);

        String created = mockMvc.perform(post("/api/v1/previews")
                        .header(SESSION_HEADER, ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(previewBody(photoId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String previewId = objectMapper.readTree(created).get("data").get("id").asText();

        mockMvc.perform(get("/api/v1/previews/{id}", previewId).header(SESSION_HEADER, strangerToken))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/v1/previews/{id}", previewId).header(SESSION_HEADER, strangerToken))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/previews/{id}", previewId).header(SESSION_HEADER, ownerToken))
                .andExpect(status().isOk());
    }

    @Test
    void unlinkedPreviewIsNeverAccessible() throws Exception {
        String token = createAnonymousSessionToken();
        mockMvc.perform(post("/api/v1/previews")
                        .header(SESSION_HEADER, token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"previewType\":\"OUTFIT_BOARD\"}"))
                .andExpect(status().isBadRequest());

        UUID orphanId = jdbc.queryForObject(
                "INSERT INTO preview_generations (status) VALUES ('SUCCEEDED') RETURNING id", UUID.class);
        mockMvc.perform(get("/api/v1/previews/{id}", orphanId).header(SESSION_HEADER, token))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/v1/previews/{id}", orphanId).header(SESSION_HEADER, token))
                .andExpect(status().isBadRequest());
    }

    private UUID insertPhoto(String sessionToken) {
        UUID sessionId = jdbc.queryForObject(
                "SELECT id FROM anonymous_sessions WHERE session_token = ?", UUID.class, sessionToken);
        return jdbc.queryForObject(
                "INSERT INTO user_photo_uploads (session_id, file_url) VALUES (?, '/uploads/user-photos/test.jpg') RETURNING id",
                UUID.class, sessionId);
    }

    private static String previewBody(UUID photoId) {
        return "{\"photoUploadId\":\"%s\",\"previewType\":\"USER_PHOTO_2D\"}".formatted(photoId);
    }
}
