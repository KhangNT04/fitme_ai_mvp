package com.fitme.recommendation;

import com.fitme.AbstractIntegrationTest;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

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
                                {"heightCm": 168, "weightKg": 60, "fitPreference": "REGULAR"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"primaryStyle": "Korean Casual", "preferredColors": ["Navy"]}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/recommendations")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"occasion": "Đi cafe", "wardrobeMode": "NO_WARDROBE_DATA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.recommendationId").isNotEmpty())
                .andExpect(jsonPath("$.data.title").isNotEmpty())
                .andExpect(jsonPath("$.data.outfitItems").isArray())
                .andExpect(jsonPath("$.data.explanation.bodyFit").isNotEmpty())
                .andExpect(jsonPath("$.data.confidence").isNotEmpty());
    }
}
