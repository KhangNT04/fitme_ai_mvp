package com.fitme.gallery;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GalleryIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void completedTryOnIsAutoSavedAndCanBeDeleted() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Gallery top", "Áo thun");
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());

        String requestId = generateBoardTryOn(owner, product);

        String json = mockMvc.perform(get("/api/v1/me/gallery").with(user(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].tryOnRequestId").value(requestId))
                .andExpect(jsonPath("$.data.items[0].imageUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.items[0].products[0].productId").value(product.getId().toString()))
                .andReturn().getResponse().getContentAsString();
        String imageId = objectMapper.readTree(json).get("data").get("items").get(0).get("id").asText();

        mockMvc.perform(get("/api/v1/me/gallery").with(user(stranger)))
                .andExpect(jsonPath("$.data.total").value(0));
        mockMvc.perform(delete("/api/v1/me/gallery/{id}", imageId).with(user(stranger)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/admin/gallery/stats").with(user(admin)))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/v1/me/gallery/{id}", imageId).with(user(owner)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/me/gallery").with(user(owner)))
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void galleryRequiresLogin() throws Exception {
        mockMvc.perform(get("/api/v1/me/gallery")).andExpect(status().is4xxClientError());
    }

    private String generateBoardTryOn(FitMeUserPrincipal principal, Product product) throws Exception {
        String body = mockMvc.perform(post("/api/v1/try-on/requests")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"previewMode": "OUTFIT_BOARD_ONLY", "heightCm": 165, "weightKg": 55}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String requestId = objectMapper.readTree(body).get("data").get("id").asText();
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId": "%s", "role": "%s", "selectedSize": "M"}
                                """.formatted(product.getId(), ItemRole.TOP)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
        return requestId;
    }
}
