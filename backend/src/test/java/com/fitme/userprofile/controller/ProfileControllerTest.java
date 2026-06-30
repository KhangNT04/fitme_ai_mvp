package com.fitme.userprofile.controller;

import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProfileControllerTest extends AbstractIntegrationTest {

    @Test
    void createAndGetBodyAndStyleProfiles() throws Exception {
        String sessionToken = createAnonymousSessionToken();

        String bodyProfileJson = """
                {
                  "heightCm": 170,
                  "weightKg": 65,
                  "gender": "FEMALE",
                  "fitPreference": "REGULAR"
                }
                """;

        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bodyProfileJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.heightCm").value(170))
                .andExpect(jsonPath("$.data.weightKg").value(65));

        String styleProfileJson = """
                {
                  "primaryStyle": "Korean Casual",
                  "preferredColors": ["Navy", "Beige"]
                }
                """;

        mockMvc.perform(post("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(styleProfileJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.primaryStyle").value("Korean Casual"));

        mockMvc.perform(get("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.heightCm").value(170));

        mockMvc.perform(get("/api/v1/me/style-profile")
                        .header(SESSION_HEADER, sessionToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.primaryStyle").value("Korean Casual"));
    }
}
