package com.fitme.recommendation;

import com.fitme.AbstractIntegrationTest;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.SizeChart;
import com.fitme.product.repository.SizeChartRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecommendationSizeChartTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;
    @Autowired
    private SizeChartRepository sizeChartRepository;

    @Test
    void recommendSize_usesSizeChartWhenBodyMeasurementsPresent() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Size chart shirt", "Áo thun");
        UUID productId = product.getId();

        sizeChartRepository.findByProductId(productId).forEach(sizeChartRepository::delete);
        sizeChartRepository.save(SizeChart.builder()
                .productId(productId)
                .sizeLabel("M")
                .chestCm(BigDecimal.valueOf(88))
                .waistCm(BigDecimal.valueOf(70))
                .hipCm(BigDecimal.valueOf(92))
                .build());
        sizeChartRepository.save(SizeChart.builder()
                .productId(productId)
                .sizeLabel("L")
                .chestCm(BigDecimal.valueOf(98))
                .waistCm(BigDecimal.valueOf(78))
                .hipCm(BigDecimal.valueOf(100))
                .build());

        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "heightCm": 170,
                                  "weightKg": 65,
                                  "gender": "FEMALE",
                                  "fitPreference": "REGULAR",
                                  "chestCm": 97,
                                  "waistCm": 77,
                                  "hipCm": 99
                                }
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
                                {
                                  "occasion": "Đi cafe",
                                  "wardrobeMode": "NO_WARDROBE_DATA",
                                  "selectedProductId": "%s"
                                }
                                """.formatted(productId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recommendedSize").value("L"));
    }
}
