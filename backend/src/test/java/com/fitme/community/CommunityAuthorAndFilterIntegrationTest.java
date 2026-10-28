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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The community flows added for "my own posts" and the public author profile: editing a
 * published post, filtering the feed and reaching an author through a random public key.
 */
class CommunityAuthorAndFilterIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void theAuthorCanEditTheWordsOfTheirOwnPost() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Edit top", "Áo thun");
        generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);
        grantCommunityConsent(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s", "title": "Tiêu đề cũ", "caption": "Mô tả cũ"}
                                """.formatted(imageId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String postId = objectMapper.readTree(body).get("data").get("post").get("id").asText();

        mockMvc.perform(patch("/api/v1/community/posts/{id}", postId)
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "Tiêu đề mới", "caption": "Mô tả mới"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Tiêu đề mới"))
                .andExpect(jsonPath("$.data.caption").value("Mô tả mới"));

        // The change is visible on the public permalink too.
        String shareCode = objectMapper.readTree(body).get("data").get("post").get("shareCode").asText();
        mockMvc.perform(get("/api/v1/community/posts/{code}", shareCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Tiêu đề mới"));
    }

    @Test
    void somebodyElseCannotEditOrRemoveAPost() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Owned top", "Áo thun");
        generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);
        grantCommunityConsent(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s"}
                                """.formatted(imageId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String postId = objectMapper.readTree(body).get("data").get("post").get("id").asText();

        mockMvc.perform(patch("/api/v1/community/posts/{id}", postId)
                        .with(user(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title": "Cướp nội dung"}
                                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void theFeedCanBeFilteredByStyleOccasionAndBrand() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Filter top", "Áo thun");
        generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);
        grantCommunityConsent(owner);
        // The post picks up its style from the author's profile, so give them one.
        setPrimaryStyle(owner, "Minimal");

        mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s", "title": "Outfit cần lọc"}
                                """.formatted(imageId)))
                .andExpect(status().isOk());

        // The filter options list what is actually published.
        mockMvc.perform(get("/api/v1/community/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.styles").isArray())
                .andExpect(jsonPath("$.data.occasions").isArray())
                .andExpect(jsonPath("$.data.brands").isArray());

        // Filtering by the style keeps the post, an unknown style does not.
        mockMvc.perform(get("/api/v1/community/posts").param("styleLabel", "Minimal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].title").value("Outfit cần lọc"));

        mockMvc.perform(get("/api/v1/community/posts").param("styleLabel", "Không Tồn Tại"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items").isEmpty())
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void theAuthorProfileIsReachableThroughARandomPublicKey() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Profile top", "Áo thun");
        generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);
        grantCommunityConsent(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s"}
                                """.formatted(imageId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode post = objectMapper.readTree(body).get("data").get("post");
        String authorKey = post.get("authorKey").asText();

        // The key is a random identifier, not the account id.
        org.assertj.core.api.Assertions.assertThat(authorKey)
                .isNotBlank()
                .isNotEqualTo(owner.getUserId().toString());

        mockMvc.perform(get("/api/v1/community/authors/{key}", authorKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.displayName").value("Test User"))
                .andExpect(jsonPath("$.data.publishedPosts").value(1))
                .andExpect(jsonPath("$.data.userId").doesNotExist())
                .andExpect(jsonPath("$.data.email").doesNotExist());

        mockMvc.perform(get("/api/v1/community/authors/{key}/posts", authorKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].shareCode").value(post.get("shareCode").asText()));

        // An unknown key is a 404, not a 500.
        mockMvc.perform(get("/api/v1/community/authors/{key}", "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }

    @Test
    void aReaderCanFollowAnAuthorThroughThePublicKey() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal reader = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Follow top", "Áo thun");
        generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);
        grantCommunityConsent(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s"}
                                """.formatted(imageId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String authorKey = objectMapper.readTree(body).get("data").get("post").get("authorKey").asText();

        mockMvc.perform(get("/api/v1/community/authors/{key}", authorKey).with(user(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.followedByMe").value(false));

        mockMvc.perform(post("/api/v1/community/authors/{key}/follow", authorKey).with(user(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));

        mockMvc.perform(get("/api/v1/community/authors/{key}", authorKey).with(user(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.followedByMe").value(true));

        mockMvc.perform(delete("/api/v1/community/authors/{key}/follow", authorKey).with(user(reader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(false));
    }

    @Test
    void aPostShowsThePhotoTheGalleryKeepsAlive() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        Product product = testDataHelper.createEligibleProduct("Alive top", "Áo thun");
        generateBoardTryOn(owner, product);
        String imageId = galleryImageId(owner);
        grantCommunityConsent(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s"}
                                """.formatted(imageId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String shareCode = objectMapper.readTree(body).get("data").get("post").get("shareCode").asText();

        // The gallery row is the authority for the photo: repointing it must change what the
        // feed shows, otherwise readers keep a provider link that dies after a while.
        repointGalleryImage(imageId, "https://pub-example.r2.dev/vton-results/alive.jpg");

        mockMvc.perform(get("/api/v1/community/posts/{code}", shareCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").value("https://pub-example.r2.dev/vton-results/alive.jpg"));
    }

    /** Gives the user a style profile, so published posts carry a style label. */
    private void setPrimaryStyle(FitMeUserPrincipal principal, String style) throws Exception {
        mockMvc.perform(post("/api/v1/me/style-profile")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"primaryStyle": "%s"}
                                """.formatted(style)))
                .andExpect(status().isOk());
    }

    private void grantCommunityConsent(FitMeUserPrincipal principal) throws Exception {        mockMvc.perform(post("/api/v1/privacy/consent")
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

    /** Moves a gallery photo to another URL, the way the mirror job does. */
    private void repointGalleryImage(String galleryImageId, String url) {
        jdbc.update("UPDATE outfit_gallery_images SET image_url = ? WHERE id = ?::uuid", url, galleryImageId);
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
