package com.fitme.address;

import com.fitme.order.CommerceIntegrationSupport;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AddressIntegrationTest extends CommerceIntegrationSupport {
    @Test
    void addressCrud_requiresOwner() throws Exception {
        String owner = registerUserAccessToken();
        String other = registerUserAccessToken();
        UUID addressId = createAddress(owner);

        mockMvc.perform(get("/api/v1/me/addresses")
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(addressId.toString()))
                .andExpect(jsonPath("$.data[0].isDefault").value(true));

        mockMvc.perform(delete("/api/v1/me/addresses/{id}", addressId)
                        .header("Authorization", "Bearer " + other))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/me/addresses/{id}", addressId)
                        .header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/me/addresses"))
                .andExpect(status().isUnauthorized());
    }
}
