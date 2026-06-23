package com.fitme.redirect.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RedirectControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void buyClick_withEligibleProduct_tracksAndReturnsRedirectUrl() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Buy click product", "Áo thun");
        String sessionToken = createAnonymousSessionToken();

        String response = mockMvc.perform(post("/api/v1/redirects/buy-click")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": "%s",
                                  "sourcePage": "recommendation"
                                }
                                """.formatted(product.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.redirectUrl").value("https://shopee.vn/test-product"))
                .andExpect(jsonPath("$.data.eventId").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String eventId = objectMapper.readTree(response).get("data").get("eventId").asText();

        mockMvc.perform(get("/api/v1/redirects/{eventId}", eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.redirectUrl").value("https://shopee.vn/test-product"));
    }

    @Test
    void buyClick_withIneligibleProduct_returnsBadRequest() throws Exception {
        Product product = testDataHelper.createIneligibleProduct("javascript:evil()");
        String sessionToken = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/redirects/buy-click")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "productId": "%s",
                                  "sourcePage": "product-detail"
                                }
                                """.formatted(product.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
