package com.fitme.cart;

import com.fitme.order.CommerceIntegrationSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CartIntegrationTest extends CommerceIntegrationSupport {
    @Test
    void addToCart_accumulatesQuantity_andRejectsStockOverflow() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(3);

        addToCart(token, fixture, 2);
        addToCart(token, fixture, 1);

        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"%s","variantId":"%s","quantity":1}
                                """.formatted(fixture.product().getId(), fixture.variant().getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("OUT_OF_STOCK"));
    }
}
