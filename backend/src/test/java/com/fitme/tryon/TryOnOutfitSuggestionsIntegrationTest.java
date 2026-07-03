package com.fitme.tryon;

import com.fitme.AbstractIntegrationTest;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TryOnOutfitSuggestionsIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void partialOutfit_returnsMissingRoleAndSuggestions() throws Exception {
        Product top = testDataHelper.createEligibleProduct("Partial top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/try-on/outfit-suggestions")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productIds": ["%s"]}
                                """.formatted(top.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.outfitComplete").value(false))
                .andExpect(jsonPath("$.data.missingRoles").isArray())
                .andExpect(jsonPath("$.data.improvementSuggestions").isNotEmpty());
    }

    @Test
    void generate_withSingleItem_returnsSuggestionsOnResult() throws Exception {
        Product top = testDataHelper.createEligibleProduct("Single top", "Áo thun");
        String sessionToken = createAnonymousSessionToken();

        String createResponse = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "previewMode": "OUTFIT_BOARD_ONLY",
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
                                  "role": "TOP",
                                  "selectedSize": "M"
                                }
                                """.formatted(top.getId())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.outfitComplete").value(false))
                .andExpect(jsonPath("$.data.improvementSuggestions").isNotEmpty());
    }
}
