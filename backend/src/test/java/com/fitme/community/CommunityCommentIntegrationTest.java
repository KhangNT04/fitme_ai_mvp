package com.fitme.community;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CommunityCommentIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * The test database is shared between test classes, so the posts this class publishes have to
     * go — otherwise other tests counting community posts would see them.
     */
    @AfterEach
    void removePublishedPosts() {
        jdbcTemplate.update("DELETE FROM community_posts");
    }

    @Test
    void commentsCanBeReadWrittenAndRepliedTo() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String postId = publishPost(owner);
        String shareCode = shareCodeOf(postId);

        // A guest may read the thread, but may not write to it.
        mockMvc.perform(get("/api/v1/community/posts/{id}/comments", postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Bình luận không cần đăng nhập"}
                                """))
                .andExpect(status().is4xxClientError());

        // A signed-in user comments on the post.
        String commentId = mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Outfit này hợp quá"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").value("Outfit này hợp quá"))
                .andExpect(jsonPath("$.data.mine").value(true))
                .andExpect(jsonPath("$.data.canDelete").value(true))
                .andExpect(jsonPath("$.data.replies.length()").value(0))
                .andReturn().getResponse().getContentAsString();

        commentId = objectMapper.readTree(commentId).get("data").get("id").asText();

        // The post now reports one comment.
        mockMvc.perform(get("/api/v1/community/posts/{code}", shareCode))
                .andExpect(jsonPath("$.data.commentCount").value(1));

        // The post owner replies.
        mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Cảm ơn bạn nha", "parentId": "%s"}
                                """.formatted(commentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.parentId").value(commentId))
                .andExpect(jsonPath("$.data.parentAuthorDisplayName").value("Test User"));

        // The thread shows the comment with its single reply.
        mockMvc.perform(get("/api/v1/community/posts/{id}/comments", postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].replies.length()").value(1))
                .andExpect(jsonPath("$.data[0].replies[0].content").value("Cảm ơn bạn nha"));

        // The counter counts the reply too.
        mockMvc.perform(get("/api/v1/community/posts/{code}", shareCode))
                .andExpect(jsonPath("$.data.commentCount").value(2));
    }

    @Test
    void repliesNestOnlyOneLevel() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String postId = publishPost(owner);

        String topLevel = mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Bình luận gốc"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        topLevel = objectMapper.readTree(topLevel).get("data").get("id").asText();

        String reply = mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Trả lời lần 1", "parentId": "%s"}
                                """.formatted(topLevel)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String replyId = objectMapper.readTree(reply).get("data").get("id").asText();

        // Answering a reply attaches to the top-level comment instead of nesting deeper.
        mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Trả lời lần 2", "parentId": "%s"}
                                """.formatted(replyId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.parentId").value(topLevel));

        mockMvc.perform(get("/api/v1/community/posts/{id}/comments", postId))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].replies.length()").value(2));
    }

    @Test
    void onlyTheAuthorOrThePostOwnerCanDeleteAComment() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal other = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String postId = publishPost(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Bình luận của người lạ"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String commentId = objectMapper.readTree(body).get("data").get("id").asText();

        // A third party cannot delete somebody else's comment.
        mockMvc.perform(delete("/api/v1/community/posts/{postId}/comments/{commentId}", postId, commentId)
                        .with(user(other)))
                .andExpect(status().isBadRequest());

        // The comment's author can delete it.
        mockMvc.perform(delete("/api/v1/community/posts/{postId}/comments/{commentId}", postId, commentId)
                        .with(user(stranger)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/community/posts/{code}", shareCodeOf(postId)))
                .andExpect(jsonPath("$.data.commentCount").value(0));
    }

    @Test
    void thePostOwnerCanDeleteACommentOnTheirPost() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal stranger = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String postId = publishPost(owner);

        String body = mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "Bình luận cần dọn dẹp"}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String commentId = objectMapper.readTree(body).get("data").get("id").asText();

        mockMvc.perform(delete("/api/v1/community/posts/{postId}/comments/{commentId}", postId, commentId)
                        .with(user(owner)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/community/posts/{id}/comments", postId))
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void emptyCommentsAreRejected() throws Exception {
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createUser().user());
        String postId = publishPost(owner);

        mockMvc.perform(post("/api/v1/community/posts/{id}/comments", postId)
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content": "   "}
                                """))
                .andExpect(status().is4xxClientError());
    }

    // ── Helpers ────────────────────────────────────────────────────────────────────────────────

    private String publishPost(FitMeUserPrincipal principal) throws Exception {
        Product product = testDataHelper.createEligibleProduct("Community comment top", "Áo thun");
        generateBoardTryOn(principal, product);
        String imageId = galleryImageId(principal);

        mockMvc.perform(post("/api/v1/privacy/consent")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"consentType": "COMMUNITY_SHARE", "accepted": true}
                                """))
                .andExpect(status().isOk());

        String body = mockMvc.perform(post("/api/v1/community/posts")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"galleryImageId": "%s", "caption": "Bài đăng có bình luận"}
                                """.formatted(imageId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode data = objectMapper.readTree(body).get("data");
        return data.get("post").get("id").asText();
    }

    /** The public permalink code of a post, used by the public read endpoint. */
    private String shareCodeOf(String postId) throws Exception {
        String json = mockMvc.perform(get("/api/v1/community/posts").param("size", "48"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        for (JsonNode item : objectMapper.readTree(json).get("data").get("items")) {
            if (postId.equals(item.get("id").asText())) {
                return item.get("shareCode").asText();
            }
        }
        throw new AssertionError("Post not found in the feed: " + postId);
    }

    private String galleryImageId(FitMeUserPrincipal principal) throws Exception {
        String json = mockMvc.perform(get("/api/v1/me/gallery").with(user(principal)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).get("data").get("items").get(0).get("id").asText();
    }

    private void generateBoardTryOn(FitMeUserPrincipal principal, Product product) throws Exception {
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
                                {"productId": "%s", "role": "TOP", "selectedSize": "M"}
                                """.formatted(product.getId())))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk());
    }
}
