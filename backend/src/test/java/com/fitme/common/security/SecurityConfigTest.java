package com.fitme.common.security;

import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityConfigTest extends AbstractIntegrationTest {

    @Test
    void publicEndpoints_accessibleWithoutAuth() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/anonymous")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/brands"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "nobody@fitme.ai", "password": "wrongpassword"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedAdminEndpoint_withoutAuth_returnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard"))
                .andExpect(status().isForbidden());
    }
}
