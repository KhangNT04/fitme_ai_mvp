package com.fitme.tryon.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ItemRole;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

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
                .andExpect(jsonPath("$.data.disclaimer").isNotEmpty());
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
