package com.fitme.tryon;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ItemRole;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class P0TryOnIntegrationTest extends AbstractIntegrationTest {

    private static final byte[] MINIMAL_JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9};
    private static final String FORBIDDEN_PHOTO = "Không có quyền truy cập ảnh này";

    @Autowired
    private TestDataHelper testDataHelper;

    /** TRY-INP-17 */
    @Test
    void anotherUsersPhotoUploadId_cannotBeUsedForTryOn() throws Exception {
        String victimSession = createAnonymousSessionToken();
        String victimUploadId = uploadPhoto(victimSession);
        mockMvc.perform(get("/api/v1/uploads/user-photo/{id}/quality", victimUploadId).header(SESSION_HEADER, victimSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.qualityStatus").value("GOOD"));

        String attacker = "Bearer " + registerUserAccessToken();
        int balanceBefore = fitkenBalance(attacker);

        mockMvc.perform(get("/api/v1/uploads/user-photo/{id}/quality", victimUploadId).header("Authorization", attacker))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(FORBIDDEN_PHOTO));

        mockMvc.perform(post("/api/v1/try-on/requests")
                        .header("Authorization", attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"previewMode":"USER_PHOTO","photoUploadId":"%s","heightCm":165,"weightKg":55}
                                """.formatted(victimUploadId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(FORBIDDEN_PHOTO));

        Product product = testDataHelper.createEligibleProduct("IDOR top", "Áo thun");
        String requestId = objectMapper.readTree(mockMvc.perform(post("/api/v1/try-on/requests")
                        .header("Authorization", attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"previewMode\":\"OUTFIT_BOARD_ONLY\",\"heightCm\":165,\"weightKg\":55}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header("Authorization", attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"%s\",\"role\":\"%s\",\"selectedSize\":\"M\"}"
                                .formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header("Authorization", attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"previewMode\":\"USER_PHOTO\",\"photoUploadId\":\"%s\"}".formatted(victimUploadId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(FORBIDDEN_PHOTO));

        mockMvc.perform(get("/api/v1/try-on/requests/{id}", requestId).header("Authorization", attacker))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.previewMode").value("OUTFIT_BOARD_ONLY"));
        assertThat(fitkenBalance(attacker)).isEqualTo(balanceBefore);
    }

    /** TRY-GEN-21 */
    @Test
    @Disabled("KNOWN GAP: AI try-on generation has no rate limit (per IP, per account or global cost cap); each "
            + "new account simply spends its 5 trial Fitken on FASHN calls. Thresholds and the shared limiter "
            + "store are a product/infra decision, not a small fix.")
    void aiTryOnGenerationFromManyFreshAccounts_isRateLimited() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Rate limit top", "Áo thun");
        List<Integer> statuses = new ArrayList<>();
        for (int account = 0; account < 6; account++) {
            String auth = "Bearer " + registerUserAccessToken();
            for (int attempt = 0; attempt < 5; attempt++) {
                String requestId = objectMapper.readTree(mockMvc.perform(post("/api/v1/try-on/requests")
                                .header("Authorization", auth)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"previewMode\":\"AVATAR\",\"avatarKey\":\"avatar-female-1\",\"heightCm\":165,\"weightKg\":55}"))
                        .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();
                mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header("Authorization", auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":\"%s\",\"role\":\"TOP\",\"selectedSize\":\"M\"}".formatted(product.getId())));
                statuses.add(mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                                .header("Authorization", auth))
                        .andReturn().getResponse().getStatus());
            }
        }
        assertThat(statuses).contains(429);
    }

    private String uploadPhoto(String sessionToken) throws Exception {
        String consentId = objectMapper.readTree(mockMvc.perform(post("/api/v1/uploads/user-photo/consent")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();
        return objectMapper.readTree(mockMvc.perform(multipart("/api/v1/uploads/user-photo")
                        .file(new MockMultipartFile("file", "me.jpg", "image/jpeg", MINIMAL_JPEG))
                        .param("consentId", consentId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();
    }

    private int fitkenBalance(String authorization) throws Exception {
        return objectMapper.readTree(mockMvc.perform(get("/api/v1/me/fitken").header("Authorization", authorization))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("balance").asInt();
    }
}
