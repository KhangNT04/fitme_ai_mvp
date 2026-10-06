package com.fitme.validation;

import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.order.CommerceIntegrationSupport;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InputValidationIntegrationTest extends CommerceIntegrationSupport {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private ProductRepository productRepository;

    @Test
    void missingIdentityReturnsUnauthorizedInsteadOfServerError() throws Exception {
        mockMvc.perform(post("/api/v1/me/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"recipientName":"A","phone":"0901234567","province":"HCM",
                                 "district":"Q1","ward":"BN","street":"1 Lê Lợi"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void addressRejectsMalformedPhoneAndStoresNormalizedOne() throws Exception {
        String token = registerUserAccessToken();
        String body = """
                {"recipientName":"Nguyễn Văn An","phone":"%s","province":"TP Hồ Chí Minh",
                 "district":"Quận 1","ward":"Bến Nghé","street":"1 Lê Lợi","isDefault":true}
                """;

        mockMvc.perform(post("/api/v1/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.formatted("abc123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_PHONE"));

        mockMvc.perform(post("/api/v1/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body.formatted("090 123.4567")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.phone").value("0901234567"));
    }

    @Test
    void bodyProfileRejectsImplausibleMeasurements() throws Exception {
        String sessionToken = createAnonymousSessionToken();
        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm":165,"weightKg":55,"chestCm":5}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void stylistChatRejectsOverlongMessage() throws Exception {
        String sessionToken = createAnonymousSessionToken();
        mockMvc.perform(post("/api/v1/stylist/chat/messages")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("message", "a".repeat(1001)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void brandCannotSaveMalformedPurchaseUrl() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testDataHelper.createBrandOwner();
        mockMvc.perform(post("/api/v1/brand/products")
                        .with(user(new FitMeUserPrincipal(owner.user())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Bad link shirt","category":"Áo sơ mi","price":299000,
                                 "purchaseUrl":"https://localhost"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_PURCHASE_URL"));
    }

    @Test
    void brandSettingsUpdateKeepsSocialLinksThatWereNotSent() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testDataHelper.createBrandOwner();
        FitMeUserPrincipal principal = new FitMeUserPrincipal(owner.user());

        mockMvc.perform(put("/api/v1/brand/me")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Social Brand","instagramUrl":"https://instagram.com/social",
                                 "tiktokShopUrl":"https://tiktok.com/@social"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/brand/me")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Social Brand","contactPhone":"0901234567","tiktokShopUrl":""}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.instagramUrl").value("https://instagram.com/social"))
                .andExpect(jsonPath("$.data.tiktokShopUrl").doesNotExist())
                .andExpect(jsonPath("$.data.contactPhone").value("0901234567"));
    }

    @Test
    void tryOnRejectsProductThatIsNotEligible() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testDataHelper.createBrandOwner();
        Product draft = testDataHelper.createDraftProductForBrand(owner.brand(), "Draft tee");
        String sessionToken = createAnonymousSessionToken();

        String created = mockMvc.perform(post("/api/v1/try-on/requests")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"heightCm":165,"weightKg":55}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(created).get("data").get("id").asText();

        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"%s","role":"%s"}
                                """.formatted(draft.getId(), ItemRole.TOP)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("TRY_ON_NOT_ELIGIBLE"));
    }

    @Test
    void adminRejectReasonIsStoredAndVisibleToBrand() throws Exception {
        TestDataHelper.BrandOwnerContext owner = testDataHelper.createBrandOwner();
        Product product = testDataHelper.createDraftProductForBrand(owner.brand(), "Needs review");
        product.setStatus(ProductStatus.PENDING_REVIEW);
        productRepository.save(product);
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());

        mockMvc.perform(post("/api/v1/admin/products/{id}/reject", product.getId())
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"%s"}
                                """.formatted("x".repeat(101))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/admin/products/{id}/reject", product.getId())
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"Ảnh sản phẩm bị mờ"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.tags[?(@.tagType=='REJECT_REASON')].tagValue").value("Ảnh sản phẩm bị mờ"));

        mockMvc.perform(get("/api/v1/brand/products/{id}", product.getId())
                        .with(user(new FitMeUserPrincipal(owner.user()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tags[?(@.tagType=='REJECT_REASON')].tagValue").value("Ảnh sản phẩm bị mờ"));
    }
}
