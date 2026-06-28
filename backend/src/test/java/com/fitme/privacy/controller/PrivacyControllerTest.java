package com.fitme.privacy.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PrivacyControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    private FitMeUserPrincipal userPrincipal;

    @BeforeEach
    void setUp() {
        userPrincipal = new FitMeUserPrincipal(testDataHelper.createUser().user());
    }

    @Test
    void recordConsent_asUser() throws Exception {
        mockMvc.perform(post("/api/v1/privacy/consent")
                        .with(user(userPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"consentType":"PHOTO_UPLOAD","accepted":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void requestDeletion_asUser() throws Exception {
        mockMvc.perform(post("/api/v1/privacy/deletion-requests")
                        .with(user(userPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"requestType":"ALL"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
