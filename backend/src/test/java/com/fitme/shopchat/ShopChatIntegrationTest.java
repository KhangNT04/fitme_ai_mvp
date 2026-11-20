package com.fitme.shopchat;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ShopChatIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    TestDataHelper data;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void userCanOpenThreadAndBrandCanReply() throws Exception {
        FitMeUserPrincipal shopper = new FitMeUserPrincipal(data.createUser().user());
        TestDataHelper.BrandOwnerContext brandOwner = data.createBrandOwner();
        FitMeUserPrincipal owner = new FitMeUserPrincipal(brandOwner.user());
        Product product = data.createEligibleProductForBrand(brandOwner.brand(), "Chat tee", "Áo thun");

        String openBody = """
                {"productId":"%s","firstMessage":"Shop oi cho minh hoi size M duoc khong?"}
                """.formatted(product.getId());

        String openJson = mockMvc.perform(post("/api/v1/me/shop-chat/threads")
                        .with(user(shopper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(openBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.thread.brandId").value(brandOwner.brand().getId().toString()))
                .andExpect(jsonPath("$.data.messages[0].senderRole").value("USER"))
                .andReturn().getResponse().getContentAsString();

        UUID threadId = UUID.fromString(objectMapper.readTree(openJson).path("data").path("thread").path("id").asText());

        mockMvc.perform(post("/api/v1/brand/inbox/threads/" + threadId + "/messages")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"body\":\"Size M on ban nha\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.senderRole").value("BRAND"));

        mockMvc.perform(get("/api/v1/me/shop-chat/threads/" + threadId)
                        .with(user(shopper)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages.length()").value(2));

        Integer userUnread = jdbcTemplate.queryForObject(
                "SELECT user_unread_count FROM shop_chat_threads WHERE id = ?", Integer.class, threadId);
        assertThat(userUnread).isZero();
    }
}
