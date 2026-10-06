package com.fitme.wardrobe.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WardrobeControllerTest extends AbstractIntegrationTest {

    private static final String TEE = """
            {
              "name": "White tee",
              "itemType": "TOP",
              "category": "Áo thun",
              "color": "White",
              "fitType": "REGULAR"
            }
            """;

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ConsumerSubscriptionService consumerSubscriptionService;

    @Test
    void premiumUser_canCreateListUpdateAndDeleteItems() throws Exception {
        FitMeUserPrincipal premium = new FitMeUserPrincipal(testDataHelper.createPremiumUser().user());

        String createResponse = mockMvc.perform(post("/api/v1/wardrobe/items")
                        .with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TEE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("White tee"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String itemId = objectMapper.readTree(createResponse).get("data").get("id").asText();

        mockMvc.perform(get("/api/v1/wardrobe/items").with(user(premium)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(itemId));

        mockMvc.perform(put("/api/v1/wardrobe/items/{id}", itemId)
                        .with(user(premium))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Updated tee",
                                  "itemType": "TOP",
                                  "category": "Áo thun",
                                  "color": "Black"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Updated tee"));

        mockMvc.perform(delete("/api/v1/wardrobe/items/{id}", itemId).with(user(premium)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/wardrobe/items").with(user(premium)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void listItems_isolatedPerPremiumUser() throws Exception {
        FitMeUserPrincipal a = new FitMeUserPrincipal(testDataHelper.createPremiumUser().user());
        FitMeUserPrincipal b = new FitMeUserPrincipal(testDataHelper.createPremiumUser().user());

        mockMvc.perform(post("/api/v1/wardrobe/items")
                        .with(user(a))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TEE))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/wardrobe/items").with(user(b)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void freeUser_isRejectedWithPremiumRequired_andDataIsKept() throws Exception {
        FitMeUserPrincipal free = new FitMeUserPrincipal(testDataHelper.createUser().user());
        UUID userId = free.getUserId();
        jdbc.update("INSERT INTO wardrobe_items (user_id, name) VALUES (?, 'Áo cũ')", userId);

        mockMvc.perform(get("/api/v1/wardrobe/items").with(user(free)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("PREMIUM_REQUIRED"))
                .andExpect(jsonPath("$.error").value("Tủ đồ là tính năng của FitMe Premium"));

        mockMvc.perform(post("/api/v1/wardrobe/items")
                        .with(user(free))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(TEE))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("PREMIUM_REQUIRED"));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM wardrobe_items WHERE user_id = ?", Integer.class, userId))
                .isEqualTo(1);
    }

    @Test
    void anonymousSession_isTreatedAsFree() throws Exception {
        mockMvc.perform(get("/api/v1/wardrobe/items").header(SESSION_HEADER, createAnonymousSessionToken()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("PREMIUM_REQUIRED"));
    }

    @Test
    void wardrobeUnlocksAfterUpgradeWithExistingItems() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        jdbc.update("INSERT INTO wardrobe_items (user_id, name) VALUES (?, 'Quần jean')", consumer.getUserId());

        mockMvc.perform(get("/api/v1/wardrobe/items").with(user(consumer)))
                .andExpect(status().isForbidden());

        consumerSubscriptionService.adminGrantPremium(consumer.getUserId(), null);

        mockMvc.perform(get("/api/v1/wardrobe/items").with(user(consumer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }
}
