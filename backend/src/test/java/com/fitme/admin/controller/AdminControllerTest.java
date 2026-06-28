package com.fitme.admin.controller;

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

class AdminControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    private FitMeUserPrincipal adminPrincipal;

    @BeforeEach
    void setUp() {
        adminPrincipal = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
    }

    @Test
    void dashboard_asAdmin_returnsStats() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard").with(user(adminPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists());
    }

    @Test
    void styleRules_list_asAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/rules/styles").with(user(adminPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void privacyConsents_asAdmin_returnsDtoList() throws Exception {
        mockMvc.perform(get("/api/v1/admin/privacy/consents").with(user(adminPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
