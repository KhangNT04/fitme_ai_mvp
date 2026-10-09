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

    @Test
    void updateLiveProduct_onlyLinkOrPhotoChangesGoBackToReview() throws Exception {
        String body = """
                {"name":"%s","category":"Áo sơ mi","price":%d,"purchaseUrl":"%s",
                 "variants":[{"colorName":"Đen","sizeLabel":"M"}],
                 "images":[
                   {"imageUrl":"%s","imageType":"MAIN"},
                   {"imageUrl":"https://picsum.photos/401/500","imageType":"%s"}]}
                """;
        String original = body.formatted("Áo", 299000, PURCHASE_URL, "https://picsum.photos/400/500", "DETAIL");
        String productId = objectMapper.readTree(mockMvc.perform(post("/api/v1/brand/products")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(original))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("id").asText();

        String otherUrl = "https://brand.example.vn/products/khac";
        // Each step changes one thing vs the previous step: name, price, purchaseUrl, first image, second image type.
        String[][] cases = {
                {"Áo mới", "350000", PURCHASE_URL, "https://picsum.photos/400/500", "DETAIL", "ACTIVE"},
                {"Áo mới", "350000", PURCHASE_URL, "https://picsum.photos/400/500", "TRY_ON", "PENDING_REVIEW"},
                {"Áo mới", "350000", otherUrl, "https://picsum.photos/400/500", "TRY_ON", "PENDING_REVIEW"},
                {"Áo mới", "350000", otherUrl, "https://picsum.photos/499/500", "TRY_ON", "PENDING_REVIEW"},
                {"Áo", "299000", otherUrl, "https://picsum.photos/499/500", "TRY_ON", "ACTIVE"},
        };
        for (String[] c : cases) {
            jdbc.update("UPDATE products SET status = 'ACTIVE' WHERE id = ?::uuid", productId);
            mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                            .with(user(principal))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body.formatted(c[0], Long.parseLong(c[1]), c[2], c[3], c[4])))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value(c[5]));
        }

        // Saved without a try-on photo (older catalog rows): the portal's default first-photo pick is not a change.
        jdbc.update("UPDATE products SET status = 'ACTIVE' WHERE id = ?::uuid", productId);
        jdbc.update("UPDATE product_images SET image_type = 'DETAIL' WHERE product_id = ?::uuid AND image_type = 'TRY_ON'",
                productId);
        String unchanged = body.formatted("Áo", 299000L, otherUrl, "https://picsum.photos/499/500", "DETAIL");
        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(unchanged))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        // Legacy absolute R2 link comes back from the portal as the equivalent /uploads/... path.
        jdbc.update("UPDATE product_images SET image_url = 'https://pub-test.r2.dev/brands/products/a.jpg' "
                + "WHERE product_id = ?::uuid AND image_url = 'https://picsum.photos/499/500'", productId);
        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(unchanged.replace("https://picsum.photos/499/500", "/uploads/brands/products/a.jpg")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        jdbc.update("UPDATE products SET status = 'DRAFT' WHERE id = ?::uuid", productId);
        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(original.replace("https://picsum.photos/400/500", "https://picsum.photos/450/500")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    void createAndUpdateProduct_rejectUnsafeImageUrls() throws Exception {
        String productId = createProduct("[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"}]");
        for (String imageUrl : new String[]{"javascript:alert(1)", "data:image/png;base64,AAAA", "file:///etc/passwd"}) {
            String json = "{\"name\":\"Áo\",\"category\":\"Áo sơ mi\",\"price\":299000,\"purchaseUrl\":\"" + PURCHASE_URL
                    + "\",\"images\":[{\"imageUrl\":\"" + imageUrl + "\",\"imageType\":\"MAIN\"}]}";
            mockMvc.perform(post("/api/v1/brand/products")
                            .with(user(principal))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("INVALID_IMAGE_URL"));
            mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                            .with(user(principal))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errorCode").value("INVALID_IMAGE_URL"));
        }

        mockMvc.perform(put("/api/v1/brand/products/{id}", productId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Áo\",\"category\":\"Áo sơ mi\",\"price\":299000,\"purchaseUrl\":\""
                                + PURCHASE_URL + "\",\"images\":[{\"imageUrl\":\"/uploads/brands/products/x.jpg\","
                                + "\"imageType\":\"MAIN\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images[0].imageUrl").value("/uploads/brands/products/x.jpg"));
    }

    @Test
    void permanentDelete_blockedOnceCustomersInteractedWithTheProduct() throws Exception {
        String reviewed = createProduct("[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"}]");
        java.util.UUID reviewerId = testDataHelper.createUser().user().getId();
        jdbc.update("INSERT INTO product_reviews (product_id, user_id, rating, content) VALUES (?::uuid, ?, 5, 'Đẹp')",
                reviewed, reviewerId);
        mockMvc.perform(post("/api/v1/brand/products/{id}/hide", reviewed).with(user(principal)))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/brand/products/{id}", reviewed).with(user(principal)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("PRODUCT_HAS_HISTORY"))
                .andExpect(jsonPath("$.error").value(
                        "Không thể xóa vĩnh viễn sản phẩm đã có đánh giá, khách quan tâm hoặc lịch sử thử đồ. "
                                + "Hãy giữ ở trạng thái Tạm ẩn."));
        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM product_reviews WHERE product_id = ?::uuid", Long.class, reviewed)).isOne();

        String untouched = createProduct("[{\"colorName\":\"Đen\",\"sizeLabel\":\"M\"}]");
        mockMvc.perform(post("/api/v1/brand/products/{id}/hide", untouched).with(user(principal)))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/brand/products/{id}", untouched).with(user(principal)))
                .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM products WHERE id = ?::uuid", Long.class, untouched)).isZero();
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
