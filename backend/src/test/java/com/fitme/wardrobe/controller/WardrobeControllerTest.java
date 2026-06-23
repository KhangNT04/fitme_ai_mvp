package com.fitme.wardrobe.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WardrobeControllerTest extends AbstractIntegrationTest {

    @Test
    void createListAndDeleteItem_withAnonymousSession() throws Exception {
        String sessionToken = createAnonymousSessionToken();

        String createResponse = mockMvc.perform(post("/api/v1/wardrobe/items")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "White tee",
                                  "itemType": "TOP",
                                  "category": "Áo thun",
                                  "color": "White",
                                  "fitType": "REGULAR"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("White tee"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String itemId = objectMapper.readTree(createResponse).get("data").get("id").asText();

        mockMvc.perform(get("/api/v1/wardrobe/items")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(itemId));

        mockMvc.perform(put("/api/v1/wardrobe/items/{id}", itemId)
                        .header(SESSION_HEADER, sessionToken)
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

        mockMvc.perform(delete("/api/v1/wardrobe/items/{id}", itemId)
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/wardrobe/items")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void listItems_isolatedPerSession() throws Exception {
        String sessionA = createAnonymousSessionToken();
        String sessionB = createAnonymousSessionToken();

        mockMvc.perform(post("/api/v1/wardrobe/items")
                        .header(SESSION_HEADER, sessionA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Session A item",
                                  "itemType": "TOP",
                                  "category": "Áo",
                                  "color": "Blue"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/wardrobe/items")
                        .header(SESSION_HEADER, sessionB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }
}
