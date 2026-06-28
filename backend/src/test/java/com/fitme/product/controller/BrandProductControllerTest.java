package com.fitme.product.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BrandProductControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    private TestDataHelper.BrandOwnerContext brandOwner;
    private FitMeUserPrincipal principal;

    @BeforeEach
    void setUp() {
        brandOwner = testDataHelper.createBrandOwner();
        principal = new FitMeUserPrincipal(brandOwner.user());
    }

    @Test
    void createAndSubmitReview_asBrandOwner() throws Exception {
        String createResponse = mockMvc.perform(post("/api/v1/brand/products")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Brand new shirt",
                                  "category": "Áo sơ mi",
                                  "price": 299000,
                                  "purchaseUrl": "https://shopee.vn/brand-shirt",
                                  "purchaseChannel": "SHOPEE",
                                  "stockStatus": "IN_STOCK"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String productId = objectMapper.readTree(createResponse).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/brand/products/{id}/submit-review", productId)
                        .with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_REVIEW"));

        mockMvc.perform(get("/api/v1/brand/products")
                        .with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id=='" + productId + "')].status").value("PENDING_REVIEW"));
    }

    @Test
    void createProduct_withVariantsAndImages() throws Exception {
        mockMvc.perform(post("/api/v1/brand/products")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Brand mapped shirt",
                                  "category": "Áo sơ mi",
                                  "price": 299000,
                                  "purchaseUrl": "https://shopee.vn/brand-shirt",
                                  "variants": [
                                    {"colorName": "Navy", "sizeLabel": "M"},
                                    {"colorName": "Navy", "sizeLabel": "L"}
                                  ],
                                  "images": [
                                    {"imageUrl": "https://picsum.photos/400/500", "imageType": "MAIN", "sortOrder": 0},
                                    {"imageUrl": "https://picsum.photos/401/500", "imageType": "DETAIL", "sortOrder": 1}
                                  ],
                                  "sizeCharts": [
                                    {"sizeLabel": "M", "chestCm": 90, "waistCm": 72, "hipCm": 94},
                                    {"sizeLabel": "L", "chestCm": 98, "waistCm": 78, "hipCm": 100}
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images.length()").value(2))
                .andExpect(jsonPath("$.data.variants.length()").value(2))
                .andExpect(jsonPath("$.data.sizeCharts.length()").value(2));
    }

    @Test
    void createProduct_withoutAuth_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/brand/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Unauthorized",
                                  "category": "Áo",
                                  "price": 100000
                                }
                                """))
                .andExpect(status().isForbidden());
    }
}
