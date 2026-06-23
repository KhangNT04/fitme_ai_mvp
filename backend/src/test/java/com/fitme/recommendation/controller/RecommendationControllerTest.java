package com.fitme.recommendation.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecommendationControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void getSaved_afterSavingRecommendation_returnsSavedList() throws Exception {
        testDataHelper.createEligibleProduct("Saved outfit top", "Áo thun");
        testDataHelper.createEligibleProduct("Saved outfit bottom", "Quần jean");

        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm": 165, "weightKg": 55, "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"primaryStyle": "Minimal", "preferredColors": ["Black"]}
                                """))
                .andExpect(status().isOk());

        String createResponse = mockMvc.perform(post("/api/v1/recommendations")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"occasion": "Dạo phố", "wardrobeMode": "NO_WARDROBE_DATA"}
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String recommendationId = objectMapper.readTree(createResponse)
                .get("data").get("recommendationId").asText();

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
}
