package com.fitme.tryon;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ItemRole;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TryOnPreviewModeIntegrationTest extends AbstractIntegrationTest {

    private static final byte[] MINIMAL_JPEG = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9
    };

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void outfitBoardMode_generatesSuccessfully() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Board top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();
        String requestId = createTryOn(sessionToken, """
                {
                  "previewMode": "OUTFIT_BOARD_ONLY",
                  "heightCm": 165,
                  "weightKg": 55
                }
                """);
        addItem(sessionToken, requestId, product);
        generateAndAssertCompleted(sessionToken, requestId, "OUTFIT_BOARD");
    }

    @Test
    void avatarMode_generatesSuccessfully() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Avatar top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();
        String requestId = createTryOn(sessionToken, """
                {
                  "previewMode": "AVATAR",
                  "avatarKey": "avatar-female-1",
                  "heightCm": 165,
                  "weightKg": 55
                }
                """);
        addItem(sessionToken, requestId, product);
        generateAndAssertCompleted(sessionToken, requestId, "AVATAR");
    }

    @Test
    void userPhotoMode_generatesSuccessfully() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Photo top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();
        String photoUploadId = uploadAndCheckPhoto(sessionToken);

        String requestId = createTryOn(sessionToken, """
                {
                  "previewMode": "USER_PHOTO",
                  "photoUploadId": "%s",
                  "heightCm": 165,
                  "weightKg": 55
                }
                """.formatted(photoUploadId));
        addItem(sessionToken, requestId, product);
        generateAndAssertCompleted(sessionToken, requestId, "USER_PHOTO_2D");
    }

    @Test
    void userPhotoMode_withoutPhotoUploadId_returnsBadRequest() throws Exception {
        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "previewMode": "USER_PHOTO",
                                  "heightCm": 165,
                                  "weightKg": 55
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    private String uploadAndCheckPhoto(String sessionToken) throws Exception {
        String consentResponse = mockMvc.perform(post("/api/v1/uploads/user-photo/consent")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        String consentId = objectMapper.readTree(consentResponse).get("data").get("id").asText();

        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", MINIMAL_JPEG);

        String uploadResponse = mockMvc.perform(multipart("/api/v1/uploads/user-photo")
                        .file(file)
                        .param("consentId", consentId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String uploadId = objectMapper.readTree(uploadResponse).get("data").get("id").asText();

        mockMvc.perform(get("/api/v1/uploads/user-photo/{id}/quality", uploadId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.qualityStatus").value("GOOD"));

        return uploadId;
    }

    private String createTryOn(String sessionToken, String body) throws Exception {
        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(createResponse).get("data").get("id").asText();
    }

    private void addItem(String sessionToken, String requestId, Product product) throws Exception {
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": "%s",
                                  "role": "%s",
                                  "selectedSize": "M"
                                }
                                """.formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());
    }

    private void generateAndAssertCompleted(String sessionToken, String requestId, String previewType)
            throws Exception {
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.previewType").value(previewType));

        mockMvc.perform(get("/api/v1/try-on/requests/{id}/result", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.previewImageUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.disclaimer").isNotEmpty());
    }
}
