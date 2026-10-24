package com.fitme.community;

import com.fasterxml.jackson.databind.JsonNode;
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

class CommunityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void publishingRequiresCommunityConsent() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Community top", "Áo thun");
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());

        String requestId = generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);

        // No consent yet: publishing must be refused.
        mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s"}
                                """.formatted(imageId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("CONSENT_REQUIRED"));

        grantCommunityConsent(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s", "caption": "Outfit đầu tiên của mình"}
                                """.formatted(imageId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.post.shareCode").isNotEmpty())
                .andExpect(jsonPath("$.data.shareUrl").value(org.hamcrest.Matchers.containsString("/outfit/")))
                .andReturn().getResponse().getContentAsString();

        JsonNode data = objectMapper.readTree(body).get("data");
        String shareCode = data.get("post").get("shareCode").asText();
        String postId = data.get("post").get("id").asText();

        // The public permalink must not leak the author's identity.
        mockMvc.perform(get("/api/v1/community/posts/{code}", shareCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.authorDisplayName").value("Test User"))
                .andExpect(jsonPath("$.data.authorEmail").doesNotExist())
                .andExpect(jsonPath("$.data.userId").doesNotExist())
                .andExpect(jsonPath("$.data.products[0].productId").value(product.getId().toString()));

        // The feed shows the post publicly.
        mockMvc.perform(get("/api/v1/community/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.items[0].shareCode").value(shareCode));

        // Another user can like and save it, but not delete it.
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        mockMvc.perform(post("/api/v1/community/posts/{id}/like", postId).with(user(stranger)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.likeCount").value(1))
                .andExpect(jsonPath("$.data.likedByMe").value(true));

        mockMvc.perform(post("/api/v1/community/posts/{id}/save", postId).with(user(stranger)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.savedByMe").value(true));

        mockMvc.perform(get("/api/v1/me/community/saves").with(user(stranger)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1));

        mockMvc.perform(delete("/api/v1/community/posts/{id}", postId).with(user(stranger)))
                .andExpect(status().isNotFound());

        // The author can remove their own post; it then disappears from the feed.
        mockMvc.perform(delete("/api/v1/community/posts/{id}", postId).with(user(owner)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/community/posts"))
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void publishingSomebodyElsesImageIsRejected() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Community top 2", "Áo thun");
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());

        generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);
        grantCommunityConsent(stranger);

        mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s"}
                                """.formatted(imageId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("COMMUNITY_IMAGE_NOT_FOUND"));
    }

    @Test
    void communityInteractionRequiresLogin() throws Exception {
        mockMvc.perform(post("/api/v1/community/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().is4xxClientError());
    }

    private void grantCommunityConsent(FitMeUserPrincipal principal) throws Exception {
        mockMvc.perform(post("/api/v1/privacy/consent")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"consentType": "COMMUNITY_SHARE", "accepted": true}
                                """))
                .andExpect(status().isOk());
    }

    private String galleryImageId(FitMeUserPrincipal principal) throws Exception {
        String json = mockMvc.perform(get("/api/v1/me/gallery").with(user(principal)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).get("data").get("items").get(0).get("id").asText();
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
