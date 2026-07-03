package com.fitme.tryon.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ItemRole;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TryOnControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void createAddItemGenerateAndResult_withAnonymousSession() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Try-on top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();

        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "occasion": "Dạo phố",
                                  "desiredVibe": "Casual",
                                  "heightCm": 165,
                                  "weightKg": 55
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String requestId = objectMapper.readTree(createResponse).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": "%s",
                                  "role": "%s",
                                  "selectedSize": "M",
                                  "selectedColor": "Black"
                                }
                                """.formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        mockMvc.perform(get("/api/v1/try-on/requests/{id}/result", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.previewImageUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.disclaimer").isNotEmpty())
                .andExpect(jsonPath("$.data.items[0].name").value("Try-on top"))
                .andExpect(jsonPath("$.data.items[0].selectedSize").value("M"))
                .andExpect(jsonPath("$.data.recommendedSize").value("M"));

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/save", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/try-on/saved")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(requestId))
                .andExpect(jsonPath("$.data[0].saved").value(true));
    }

    @Test
    void saveAndGetSaved_withAuthenticatedUserAndAnonymousSession() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Try-on auth top", "Áo khoác");
        String sessionToken = createAnonymousSessionToken();

        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "occasion": "Dạo phố",
                                  "heightCm": 165,
                                  "weightKg": 55
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String requestId = objectMapper.readTree(createResponse).get("data").get("id").asText();

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

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        String registerResponse = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "tryon-saved-%s@fitme.ai",
                                  "password": "fitme123",
                                  "displayName": "TryOn Saved"
                                }
                                """.formatted(System.nanoTime())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String accessToken = objectMapper.readTree(registerResponse)
                .get("data").get("accessToken").asText();

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/save", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/try-on/saved")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(requestId))
                .andExpect(jsonPath("$.data[0].saved").value(true));
    }

    @Test
    void unsave_withRegisteredUserJwtOnly_removesFromSavedList() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Try-on JWT unsave top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();

        String registerResponse = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "tryon-unsave-%s@fitme.ai",
                                  "password": "fitme123",
                                  "displayName": "TryOn Unsave"
                                }
                                """.formatted(System.nanoTime())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String accessToken = objectMapper.readTree(registerResponse)
                .get("data").get("accessToken").asText();

        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 165, "weightKg": 55}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String requestId = objectMapper.readTree(createResponse).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": "%s",
                                  "role": "%s",
                                  "selectedSize": "M"
                                }
                                """.formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/save", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/try-on/requests/{id}/save", requestId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/try-on/saved")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void unsave_afterSaving_removesFromSavedList() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Try-on unsave top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();

        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 165, "weightKg": 55}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String requestId = objectMapper.readTree(createResponse).get("data").get("id").asText();

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

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/save", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/try-on/requests/{id}/save", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/try-on/saved")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void addItem_replacesExistingItemWithSameRole() throws Exception {
        Product topA = testDataHelper.createEligibleProduct("Top A", "Áo thun");
        Product topB = testDataHelper.createEligibleProduct("Top B", "Áo sơ mi");
        String sessionToken = createAnonymousSessionToken();

        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 165, "weightKg": 55}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String requestId = objectMapper.readTree(createResponse).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId": "%s", "role": "%s"}
                                """.formatted(topA.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId": "%s", "role": "%s"}
                                """.formatted(topB.getId(), ItemRole.TOP)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].productId").value(topB.getId().toString()));
    }

    @Test
    void generate_withoutItems_returnsBadRequest() throws Exception {
        String sessionToken = createAnonymousSessionToken();

        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"occasion": "Công sở"}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode data = objectMapper.readTree(createResponse).get("data");
        String requestId = data.get("id").asText();

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
