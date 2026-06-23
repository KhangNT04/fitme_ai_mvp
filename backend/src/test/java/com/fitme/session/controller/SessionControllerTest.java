package com.fitme.session.controller;

import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SessionControllerTest extends AbstractIntegrationTest {

    @Test
    void createAnonymousSession_returnsToken() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/anonymous")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionToken").isNotEmpty())
                .andExpect(jsonPath("$.data.sessionId").isNotEmpty())
                .andExpect(jsonPath("$.data.privacyVersion").value("2026-01"));
    }

    @Test
    void getCurrentSession_withoutHeader_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/sessions/current"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getCurrentSession_withSessionHeader_returnsSession() throws Exception {
        String token = createAnonymousSessionToken();

        mockMvc.perform(get("/api/v1/sessions/current")
                        .header(SESSION_HEADER, token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionToken").value(token));
    }
}
