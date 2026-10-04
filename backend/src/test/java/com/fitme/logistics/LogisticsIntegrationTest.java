package com.fitme.logistics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.order.CommerceIntegrationSupport;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LogisticsIntegrationTest extends CommerceIntegrationSupport {
    @Test
    void sellerFlow_andLogisticsDelivery_completeCodOrder() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(3);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        JsonNode checkout = placeOrder(token, addressId, "COD", null);
        UUID orderId = UUID.fromString(checkout.at("/order/id").asText());
        UUID sellerOrderId = UUID.fromString(checkout.at("/order/sellerOrders/0/id").asText());
        FitMeUserPrincipal seller = new FitMeUserPrincipal(fixture.owner().user());

        TestDataHelper.BrandOwnerContext otherOwner = testData.createBrandOwner();
        mockMvc.perform(get("/api/v1/brand/orders/{id}", sellerOrderId)
                        .with(user(new FitMeUserPrincipal(otherOwner.user()))))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/brand/orders/{id}/confirm", sellerOrderId).with(user(seller)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/brand/orders/{id}/pack", sellerOrderId).with(user(seller)))
                .andExpect(status().isOk());
        MvcResult shipResult = mockMvc.perform(post("/api/v1/brand/orders/{id}/ship", sellerOrderId)
                        .with(user(seller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"carrier\":\"GHN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("READY_TO_PICK"))
                .andReturn();
        String trackingCode = data(shipResult).get("trackingCode").asText();

        mockMvc.perform(post("/api/v1/webhooks/logistics")
                        .header("X-Logistics-Token", "dev-logistics-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"trackingCode":"%s","status":"DELIVERED","description":"Đã giao hàng","location":"TP Hồ Chí Minh"}
                                """.formatted(trackingCode)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DELIVERED"));

        mockMvc.perform(get("/api/v1/orders/{id}", orderId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.data.sellerOrders[0].status").value("DELIVERED"));
    }
}
