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

    private static final String PURCHASE_URL = "https://brand.example.vn/products/ao";

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
                                  "purchaseUrl": "https://brand.example.vn/products/brand-shirt",
                                  "purchaseChannel": "BRAND_WEBSITE",
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
                                  "purchaseUrl": "https://brand.example.vn/products/brand-shirt",
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
                            .content("{\"name\":\"Áo\",\"category\":\"Áo\",\"purchaseUrl\":\"" + PURCHASE_URL
                                    + "\",\"price\":" + price + "}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Giá sản phẩm tối thiểu 1.000đ"));
        }
        String productId = createProduct("[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"}]");
        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo\",\"category\":\"Áo\",\"purchaseUrl\":\"" + PURCHASE_URL
                                + "\",\"price\":-5}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateProduct_requiresValidPurchaseUrl() throws Exception {
        String productId = createProduct("[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"}]");
        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo\",\"category\":\"Áo sơ mi\",\"price\":299000}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Link mua hàng không được để trống"));
        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo\",\"category\":\"Áo sơ mi\",\"price\":299000,"
                                + "\"purchaseUrl\":\"javascript:alert(1)\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_PURCHASE_URL"));
        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
                "SELECT purchase_url FROM products WHERE id=?::uuid", String.class, productId)).isEqualTo(PURCHASE_URL);
    }

    @Test
    void updateProduct_keepsVariantIds() throws Exception {
        String productId = createProduct(
                "[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"},{\"colorName\":\"Đen\",\"sizeLabel\":\"L\"}]");
        java.util.UUID keptId = jdbc.queryForObject(
                "SELECT id FROM product_variants WHERE product_id=?::uuid AND size_label='M'", java.util.UUID.class, productId);

        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Áo mới","category":"Áo sơ mi","price":350000,
                                 "purchaseUrl":"https://brand.example.vn/products/ao-moi",
                                 "variants":[{"colorName":"Đen","sizeLabel":"M"},{"colorName":"Trắng","sizeLabel":"M"}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.variants.length()").value(2))
                .andExpect(jsonPath("$.data.variants[?(@.id=='" + keptId + "')]").exists())
                .andExpect(jsonPath("$.data.variants[0].stockQuantity").doesNotExist())
                .andExpect(jsonPath("$.data.purchasable").doesNotExist());

        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM product_variants WHERE product_id=?::uuid AND size_label='L'", Long.class, productId))
                .isZero();
    }

    @Test
    void tryOnImage_defaultsToFirstPhotoAndFollowsTheBrandsPick() throws Exception {
        String productId = createProduct("[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"}]");
        String gallery = """
                {"name":"Áo","category":"Áo","price":299000,"purchaseUrl":"%s",
                 "variants":[{"colorName":"Đen","sizeLabel":"M"}],
                 "images":[
                   {"imageUrl":"https://picsum.photos/400/500","imageType":"%s"},
                   {"imageUrl":"https://picsum.photos/401/500","imageType":"%s"},
                   {"imageUrl":"https://picsum.photos/402/500","imageType":"%s"}]}
                """;

        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gallery.formatted(PURCHASE_URL, "MAIN", "DETAIL", "DETAIL")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images[0].imageType").value("TRY_ON"))
                .andExpect(jsonPath("$.data.images[1].imageType").value("DETAIL"));

        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gallery.formatted(PURCHASE_URL, "MAIN", "TRY_ON", "TRY_ON")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images[0].imageType").value("MAIN"))
                .andExpect(jsonPath("$.data.images[1].imageType").value("TRY_ON"))
                .andExpect(jsonPath("$.data.images[2].imageType").value("DETAIL"));

        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gallery.formatted(PURCHASE_URL, "MAIN", "TRY_ON", "DETAIL")
                                .replace("\"category\":\"Áo\"", "\"category\":\"Phụ kiện\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images[?(@.imageType=='TRY_ON')]").isEmpty());
    }

    private String createProduct(String variantsJson) throws Exception {
        String json = mockMvc.perform(post("/api/v1/brand/products")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo\",\"category\":\"Áo sơ mi\",\"price\":299000,\"purchaseUrl\":\""
                                + PURCHASE_URL + "\",\"variants\":" + variantsJson + "}"))
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
