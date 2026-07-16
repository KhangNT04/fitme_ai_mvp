package com.fitme.recommendation.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecommendationControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    private String createBodyAndRecommend(String sessionToken) throws Exception {
        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 165, "weightKg": 55, "age": 25, "gender": "FEMALE", "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        String createResponse = mockMvc.perform(post("/api/v1/recommendations")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"wardrobeMode": "NO_WARDROBE_DATA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.requestId").exists())
                .andExpect(jsonPath("$.data.options").isArray())
                .andExpect(jsonPath("$.data.options.length()").value(4))
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(createResponse)
                .get("data").get("options").get(0).get("recommendationId").asText();
    }

    @Test
    void getSaved_afterSavingRecommendation_returnsSavedList() throws Exception {
        testDataHelper.createEligibleProduct("Saved outfit top", "Áo thun");
        testDataHelper.createEligibleProduct("Saved outfit bottom", "Quần jean");

        String sessionToken = createAnonymousSessionToken();
        String recommendationId = createBodyAndRecommend(sessionToken);

        mockMvc.perform(post("/api/v1/recommendations/{id}/save", recommendationId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/v1/recommendations/saved")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].recommendationId").value(recommendationId));
    }

    @Test
    void unsave_afterSaving_removesFromSavedList() throws Exception {
        testDataHelper.createEligibleProduct("Unsave outfit top", "Áo thun");
        testDataHelper.createEligibleProduct("Unsave outfit bottom", "Quần jean");

        String sessionToken = createAnonymousSessionToken();
        String recommendationId = createBodyAndRecommend(sessionToken);

        mockMvc.perform(post("/api/v1/recommendations/{id}/save", recommendationId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/recommendations/{id}/save", recommendationId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/recommendations/saved")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }
}
