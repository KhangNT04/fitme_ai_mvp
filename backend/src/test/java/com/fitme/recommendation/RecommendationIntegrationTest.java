package com.fitme.recommendation;

import com.fitme.AbstractIntegrationTest;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecommendationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void generateRecommendation_withSessionAndProfiles_returnsOutfit() throws Exception {
        testDataHelper.createEligibleProduct("Áo thun test", "Áo thun");
        testDataHelper.createEligibleProduct("Quần jean test", "Quần jean");
        testDataHelper.createEligibleProduct("Giày sneaker test", "Giày sneaker");

        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 168, "weightKg": 60, "gender": "FEMALE", "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"primaryStyle": "Korean Casual", "preferredColors": ["Navy"]}
                                """))
                .andExpect(status().isOk());

        String createResponse = mockMvc.perform(post("/api/v1/recommendations")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"occasion": "Đi cafe", "wardrobeMode": "NO_WARDROBE_DATA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.requestId").isNotEmpty())
                .andExpect(jsonPath("$.data.options").isArray())
                .andExpect(jsonPath("$.data.options[0].recommendationId").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String recommendationId = objectMapper.readTree(createResponse)
                .get("data").get("options").get(0).get("recommendationId").asText();

        mockMvc.perform(get("/api/v1/recommendations/{id}", recommendationId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").isNotEmpty())
                .andExpect(jsonPath("$.data.outfitItems").isArray())
                .andExpect(jsonPath("$.data.explanation.bodyFit").isNotEmpty())
                .andExpect(jsonPath("$.data.confidence").isNotEmpty());
    }

    @Test
    void generateRecommendation_ignoresMissingSelectedProduct() throws Exception {
        testDataHelper.createEligibleProduct("Áo test", "Áo thun");
        testDataHelper.createEligibleProduct("Quần test", "Quần jean");
        testDataHelper.createEligibleProduct("Giày test", "Giày sneaker");

        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 168, "weightKg": 60, "gender": "FEMALE", "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/recommendations")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "selectedProductId": "78212fad-7c31-4688-a76e-97585355822b",
                                  "wardrobeMode": "NO_WARDROBE_DATA"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.options[0].recommendationId").isNotEmpty());
    }

    @Test
    void generateRecommendation_withoutOptionalStyleOrOccasion_returnsOutfit() throws Exception {
        testDataHelper.createEligibleProduct("Áo casual", "Áo thun");
        testDataHelper.createEligibleProduct("Quần casual", "Quần jean");
        testDataHelper.createEligibleProduct("Giày casual", "Giày sneaker");

        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 165, "weightKg": 55, "gender": "FEMALE", "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/recommendations")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"wardrobeMode": "MIX_WARDROBE_AND_BRAND"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.options").isArray())
                .andExpect(jsonPath("$.data.options.length()").value(4))
                .andExpect(jsonPath("$.data.options[0].title").isNotEmpty())
                .andExpect(jsonPath("$.data.options[0].styleLabel").isNotEmpty());
    }
}
