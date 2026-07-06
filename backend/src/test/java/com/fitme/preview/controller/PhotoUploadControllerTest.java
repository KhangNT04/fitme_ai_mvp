package com.fitme.preview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PhotoUploadControllerTest extends AbstractIntegrationTest {

    private static final byte[] MINIMAL_JPEG = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9
    };

    @Test
    void upload_withoutConsent_returnsBadRequest() throws Exception {
        String sessionToken = createAnonymousSessionToken();
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", MINIMAL_JPEG);

        mockMvc.perform(multipart("/api/v1/uploads/user-photo")
                        .file(file)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void consentUploadQualityAndDelete_withSession() throws Exception {
        String sessionToken = createAnonymousSessionToken();

        String consentResponse = mockMvc.perform(post("/api/v1/uploads/user-photo/consent")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONSENTED"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode consentData = objectMapper.readTree(consentResponse).get("data");
        String consentId = consentData.get("id").asText();

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", MINIMAL_JPEG);

        String uploadResponse = mockMvc.perform(multipart("/api/v1/uploads/user-photo")
                        .file(file)
                        .param("consentId", consentId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("UPLOADED"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String uploadId = objectMapper.readTree(uploadResponse).get("data").get("id").asText();
        String fileUrl = objectMapper.readTree(uploadResponse).get("data").get("fileUrl").asText();

        mockMvc.perform(get("/api/v1/uploads/user-photo/{id}/quality", uploadId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.qualityStatus").value("GOOD"))
                .andExpect(jsonPath("$.data.fileUrl").value(fileUrl));

        mockMvc.perform(get(fileUrl))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("image/")));

        mockMvc.perform(delete("/api/v1/uploads/user-photo/{id}", uploadId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
