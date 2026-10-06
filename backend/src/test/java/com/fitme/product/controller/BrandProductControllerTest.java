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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BrandProductControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

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
    void createAndUpdateProduct_rejectNegativeOrZeroPrice() throws Exception {
        for (String price : new String[]{"-1000", "0"}) {
            mockMvc.perform(post("/api/v1/brand/products")
                            .with(user(principal))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Áo\",\"category\":\"Áo\",\"price\":" + price + "}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Giá sản phẩm tối thiểu 1.000đ"));
        }
        String productId = createProduct("[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"}]");
        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo\",\"category\":\"Áo\",\"price\":-5}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateProduct_keepsVariantIdsAndStock() throws Exception {
        String productId = createProduct(
                "[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"},{\"colorName\":\"Đen\",\"sizeLabel\":\"L\"}]");
        java.util.UUID keptId = jdbc.queryForObject(
                "SELECT id FROM product_variants WHERE product_id=?::uuid AND size_label='M'", java.util.UUID.class, productId);
        jdbc.update("UPDATE product_variants SET stock_quantity=7 WHERE id=?", keptId);

        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Áo mới","category":"Áo sơ mi","price":350000,
                                 "variants":[{"colorName":"Đen","sizeLabel":"M"},{"colorName":"Trắng","sizeLabel":"M"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.variants.length()").value(2));

        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
                "SELECT stock_quantity FROM product_variants WHERE id=?", Integer.class, keptId)).isEqualTo(7);
        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM product_variants WHERE product_id=?::uuid AND size_label='L'", Long.class, productId))
                .isZero();
    }

    private String createProduct(String variantsJson) throws Exception {
        String json = mockMvc.perform(post("/api/v1/brand/products")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo\",\"category\":\"Áo sơ mi\",\"price\":299000,\"variants\":"
                                + variantsJson + "}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).get("data").get("id").asText();
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
