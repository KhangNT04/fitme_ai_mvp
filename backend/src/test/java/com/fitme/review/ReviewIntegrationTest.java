package com.fitme.review;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.fitken.service.FitkenService;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReviewIntegrationTest extends AbstractIntegrationTest {

    private static final byte[] MINIMAL_JPEG = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xD9
    };
    private static final String LONG_CONTENT = "Áo mặc rất vừa, chất vải mát và đúng màu như ảnh.";

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private FitkenService fitkenService;

    @Test
    void reviewRewardRequiresImageAndEnoughContent() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Review top", "Áo thun");
        FitMeUserPrincipal noImage = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal withImage = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal shortText = new FitMeUserPrincipal(testDataHelper.createUser().user());

        createReview(noImage, product.getId(), 4, LONG_CONTENT, List.of())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rewardGranted").value(0));
        assertThat(fitkenService.findWallet(noImage.getUserId())).isEmpty();

        String imageUrl = uploadImage(withImage);
        assertThat(imageUrl).startsWith("/uploads/reviews/");
        createReview(withImage, product.getId(), 5, LONG_CONTENT, List.of(imageUrl))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rewardGranted").value(3))
                .andExpect(jsonPath("$.data.review.imageUrls[0]").value(imageUrl))
                .andExpect(jsonPath("$.data.review.verifiedPurchase").value(false));
        assertThat(fitkenService.balance(withImage.getUserId())).isEqualTo(8);

        createReview(shortText, product.getId(), 3, "Đẹp", List.of(uploadImage(shortText)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rewardGranted").value(0));

        createReview(withImage, product.getId(), 5, LONG_CONTENT, List.of(imageUrl))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("REVIEW_EXISTS"));

        mockMvc.perform(get("/api/v1/products/{id}/reviews", product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(3))
                .andExpect(jsonPath("$.data.averageRating").value(4.0))
                .andExpect(jsonPath("$.data.items[0].authorName").value("Test User"));
    }

    @Test
    void externalImageUrlsAreRejected() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Review ext top", "Áo thun");
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());

        createReview(principal, product.getId(), 5, LONG_CONTENT, List.of("https://evil.example/cat.jpg"))
                .andExpect(status().isBadRequest());
        assertThat(fitkenService.findWallet(principal.getUserId())).isEmpty();
    }

    @Test
    void writingReviewsAndUploadingRequireLogin() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Review anon top", "Áo thun");
        mockMvc.perform(post("/api/v1/products/{id}/reviews", product.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\": 5, \"content\": \"%s\"}".formatted(LONG_CONTENT)))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(multipart("/api/v1/reviews/images")
                        .file(new MockMultipartFile("file", "r.jpg", "image/jpeg", MINIMAL_JPEG)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void adminCanHideReviewAndRevokeReward() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Review hide top", "Áo thun");
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());

        String body = createReview(principal, product.getId(), 1, LONG_CONTENT, List.of(uploadImage(principal)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String reviewId = objectMapper.readTree(body).get("data").get("review").get("id").asText();
        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(8);

        mockMvc.perform(post("/api/v1/admin/reviews/{id}/hide", reviewId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"Spam\", \"revokeReward\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("HIDDEN"));
        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(5);

        mockMvc.perform(get("/api/v1/products/{id}/reviews", product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalCount").value(0));
        mockMvc.perform(get("/api/v1/admin/reviews").param("status", "HIDDEN").with(user(admin)))
                .andExpect(status().isOk());
    }

    @Test
    void helpfulVotesAreCountedOncePerUserAndNeverByTheAuthor() throws Exception {
        Product product = testDataHelper.createEligibleProduct("Review helpful top", "Áo thun");
        FitMeUserPrincipal author = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal voter = new FitMeUserPrincipal(testDataHelper.createUser().user());

        String body = createReview(author, product.getId(), 5, LONG_CONTENT, List.of())
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String reviewId = objectMapper.readTree(body).get("data").get("review").get("id").asText();

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/reviews/{id}/helpful", reviewId).with(user(voter)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.helpfulCount").value(1))
                    .andExpect(jsonPath("$.data.helpfulByMe").value(true));
        }
        mockMvc.perform(post("/api/v1/reviews/{id}/helpful", reviewId).with(user(author)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/reviews/{id}/helpful", reviewId))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(get("/api/v1/products/{id}/reviews", product.getId()).with(user(voter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].helpfulCount").value(1))
                .andExpect(jsonPath("$.data.items[0].helpfulByMe").value(true))
                .andExpect(jsonPath("$.data.items[0].mine").value(false));
        mockMvc.perform(get("/api/v1/products/{id}/reviews", product.getId()).with(user(author)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].mine").value(true));
        mockMvc.perform(get("/api/v1/products/{id}/reviews", product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].helpfulByMe").value(false));

        mockMvc.perform(get("/api/v1/products/featured-reviews").param("limit", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '%s')].productName".formatted(reviewId))
                        .value("Review helpful top"));

        mockMvc.perform(delete("/api/v1/reviews/{id}/helpful", reviewId).with(user(voter)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.helpfulCount").value(0))
                .andExpect(jsonPath("$.data.helpfulByMe").value(false));
    }

    private String uploadImage(FitMeUserPrincipal principal) throws Exception {
        String json = mockMvc.perform(multipart("/api/v1/reviews/images")
                        .file(new MockMultipartFile("file", "review.jpg", "image/jpeg", MINIMAL_JPEG))
                        .with(user(principal)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).get("data").get("url").asText();
    }

    private ResultActions createReview(FitMeUserPrincipal principal, UUID productId, int rating, String content,
                                       List<String> imageUrls) throws Exception {
        String body = objectMapper.writeValueAsString(java.util.Map.of(
                "rating", rating, "content", content, "imageUrls", imageUrls));
        return mockMvc.perform(post("/api/v1/products/{id}/reviews", productId)
                .with(user(principal))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}
