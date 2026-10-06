package com.fitme.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.common.security.FitMeUserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SellerOrderIntegrationTest extends CommerceIntegrationSupport {

    @Test
    void sellerDetail_containsOnlyOwnSellerOrder_neverOtherBrandsItems() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture mine = productFixture(5);
        ProductFixture other = productFixture(5);
        UUID addressId = createAddress(token);
        addToCart(token, mine, 2);
        addToCart(token, other, 1);
        JsonNode checkout = placeOrder(token, addressId, "COD", null);
        UUID orderId = UUID.fromString(checkout.at("/order/id").asText());
        String mineBrand = mine.owner().brand().getId().toString();
        UUID mySellerOrder = mineBrand.equals(checkout.at("/order/sellerOrders/0/brandId").asText())
                ? sellerOrderId(checkout, 0) : sellerOrderId(checkout, 1);
        UUID otherSellerOrder = mySellerOrder.equals(sellerOrderId(checkout, 0))
                ? sellerOrderId(checkout, 1) : sellerOrderId(checkout, 0);
        FitMeUserPrincipal seller = new FitMeUserPrincipal(mine.owner().user());

        mockMvc.perform(get("/api/v1/brand/orders/{id}", mySellerOrder).with(user(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(mySellerOrder.toString()))
                .andExpect(jsonPath("$.data.orderId").value(orderId.toString()))
                .andExpect(jsonPath("$.data.orderCode").value(checkout.at("/order/orderCode").asText()))
                .andExpect(jsonPath("$.data.brandId").value(mineBrand))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.paymentMethod").value("COD"))
                .andExpect(jsonPath("$.data.paymentStatus").value("UNPAID"))
                .andExpect(jsonPath("$.data.subtotalVnd").value(300_000))
                .andExpect(jsonPath("$.data.commissionVnd").value(30_000))
                .andExpect(jsonPath("$.data.payoutVnd").value(270_000))
                .andExpect(jsonPath("$.data.address.recipientName").exists())
                .andExpect(jsonPath("$.data.address.phone").value("0901234567"))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].productId").value(mine.product().getId().toString()))
                .andExpect(jsonPath("$.data.items[0].quantity").value(2))
                .andExpect(jsonPath("$.data.shipment").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.sellerOrders").doesNotExist())
                .andExpect(jsonPath("$.data.totalVnd").doesNotExist());

        mockMvc.perform(get("/api/v1/brand/orders/{id}", otherSellerOrder).with(user(seller)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/brand/orders/{id}/confirm", mySellerOrder).with(user(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(mySellerOrder.toString()))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.sellerOrders").doesNotExist());

        mockMvc.perform(post("/api/v1/brand/orders/{id}/cancel", mySellerOrder)
                        .with(user(seller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Het hang\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelReason").value("Het hang"));

        mockMvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PROCESSING"))
                .andExpect(jsonPath("$.data.sellerOrders.length()").value(2));
    }

    @Test
    void suspendedBrand_cannotProcessOrdersOrSettlements() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(5);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        JsonNode checkout = placeOrder(token, addressId, "COD", null);
        UUID sellerOrder = sellerOrderId(checkout, 0);
        FitMeUserPrincipal seller = new FitMeUserPrincipal(fixture.owner().user());
        jdbc.update("UPDATE brands SET status='SUSPENDED' WHERE id=?", fixture.owner().brand().getId());

        mockMvc.perform(post("/api/v1/brand/orders/{id}/confirm", sellerOrder).with(user(seller)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_SUSPENDED"));
        mockMvc.perform(get("/api/v1/brand/orders").with(user(seller)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_SUSPENDED"));
        mockMvc.perform(get("/api/v1/brand/me").with(user(seller)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_SUSPENDED"));
    }

    @Test
    void sellerCancelOnPaidMultiSellerOrder_recordsRefundDueForCancelledPart() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture first = productFixture(5);
        ProductFixture second = productFixture(5);
        UUID addressId = createAddress(token);
        addToCart(token, first, 2);
        addToCart(token, second, 1);
        JsonNode checkout = placeOrder(token, addressId, "PAYOS", null);
        UUID orderId = UUID.fromString(checkout.at("/order/id").asText());
        long total = checkout.at("/order/totalVnd").asLong();
        long payosCode = jdbc.queryForObject("SELECT payos_order_code FROM orders WHERE id=?", Long.class, orderId);
        mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"data\":{\"orderCode\":" + payosCode + "}}"))
                .andExpect(status().isOk());

        String firstBrand = first.owner().brand().getId().toString();
        boolean firstIsZero = firstBrand.equals(checkout.at("/order/sellerOrders/0/brandId").asText());
        UUID firstSellerOrder = sellerOrderId(checkout, firstIsZero ? 0 : 1);
        UUID secondSellerOrder = sellerOrderId(checkout, firstIsZero ? 1 : 0);
        JsonNode secondPart = checkout.at("/order/sellerOrders/" + (firstIsZero ? 1 : 0));
        long secondOwed = secondPart.get("subtotalVnd").asLong() + secondPart.get("shippingFeeVnd").asLong();

        mockMvc.perform(post("/api/v1/brand/orders/{id}/cancel", firstSellerOrder)
                        .with(user(new FitMeUserPrincipal(first.owner().user())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Het hang\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.data.refundDueVnd").value(total - secondOwed));

        mockMvc.perform(post("/api/v1/brand/orders/{id}/cancel", secondSellerOrder)
                        .with(user(new FitMeUserPrincipal(second.owner().user())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Het hang\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/orders/{id}", orderId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.paymentStatus").value("REFUNDED"))
                .andExpect(jsonPath("$.data.refundDueVnd").value(total));
    }
}
