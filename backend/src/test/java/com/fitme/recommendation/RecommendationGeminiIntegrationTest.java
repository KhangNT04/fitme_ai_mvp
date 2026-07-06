package com.fitme.recommendation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.AbstractIntegrationTest;
import com.fitme.ai.client.GeminiStylistClient;
import com.fitme.ai.dto.GeminiOutfitSuggestion;
import com.fitme.common.config.FitMeProperties;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@TestPropertySource(properties = {
        "fitme.ai.stylist-mode=gemini",
        "fitme.ai.gemini-api-key=test-key",
        "fitme.seed.enabled=false"
})
@Import(RecommendationGeminiIntegrationTest.StubConfig.class)
class RecommendationGeminiIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @BeforeEach
    void resetStub() {
        StubGeminiStylistClient.nextResponse.set(Optional.empty());
    }

    @Test
    void generateRecommendation_withGeminiMock_usesGeminiTitle() throws Exception {
        Product top = testDataHelper.createEligibleProduct("Gemini top", "Áo thun");
        Product bottom = testDataHelper.createEligibleProduct("Gemini bottom", "Quần jean");

        GeminiOutfitSuggestion suggestion = new GeminiOutfitSuggestion();
        suggestion.setTitle("Outfit AI từ Gemini");
        suggestion.setRecommendedSize("M");
        suggestion.setAlternativeSize("L");
        suggestion.setRecommendedForm("regular");
        suggestion.setRecommendedColor("navy");
        suggestion.setConfidence("HIGH");

        GeminiOutfitSuggestion.Item topItem = new GeminiOutfitSuggestion.Item();
        topItem.setProductId(top.getId().toString());
        topItem.setRole("TOP");
        topItem.setSelectedSize("M");
        GeminiOutfitSuggestion.Item bottomItem = new GeminiOutfitSuggestion.Item();
        bottomItem.setProductId(bottom.getId().toString());
        bottomItem.setRole("BOTTOM");
        bottomItem.setSelectedSize("M");
        suggestion.setItems(List.of(topItem, bottomItem));

        GeminiOutfitSuggestion.Explanation explanation = new GeminiOutfitSuggestion.Explanation();
        explanation.setBodyFit("Form regular ôm vừa số đo.");
        explanation.setStyleFit("Hợp gu Korean casual.");
        explanation.setOccasionFit("Nhẹ nhàng cho đi cafe.");
        explanation.setColorFit("Navy dễ phối.");
        suggestion.setExplanation(explanation);

        StubGeminiStylistClient.nextResponse.set(Optional.of(suggestion));

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

        mockMvc.perform(post("/api/v1/recommendations")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"occasion": "Đi cafe", "wardrobeMode": "NO_WARDROBE_DATA"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Outfit AI từ Gemini"))
                .andExpect(jsonPath("$.data.stylistSource").value("gemini"))
                .andExpect(jsonPath("$.data.explanation.summary").value(org.hamcrest.Matchers.containsString("Outfit AI từ Gemini")))
                .andExpect(jsonPath("$.data.outfitItems.length()").value(2));
    }

    @TestConfiguration
    static class StubConfig {
        @Bean
        @Primary
        GeminiStylistClient geminiStylistClient() {
            return new StubGeminiStylistClient();
        }
    }

    static class StubGeminiStylistClient extends GeminiStylistClient {
        static final AtomicReference<Optional<GeminiOutfitSuggestion>> nextResponse =
                new AtomicReference<>(Optional.empty());

        StubGeminiStylistClient() {
            super(new FitMeProperties(), new ObjectMapper());
        }

        @Override
        public Optional<GeminiOutfitSuggestion> suggestOutfit(String contextJson) {
            return nextResponse.get();
        }
    }
}
