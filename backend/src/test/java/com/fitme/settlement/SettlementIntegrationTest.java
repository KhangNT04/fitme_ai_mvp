package com.fitme.settlement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.order.CommerceIntegrationSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SettlementIntegrationTest extends CommerceIntegrationSupport {
    @Test
    void generation_includesOnlyDeliveredOrdersPastHoldPeriod_andReturnsTypedDto() throws Exception {
        Instant now = Instant.parse("2026-10-04T00:00:00Z");
        appClock.setClock(Clock.fixed(now, ZoneOffset.UTC));
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(5);
        UUID brandId = fixture.owner().brand().getId();
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testData.createAdmin().user());
        UUID addressId = createAddress(token);

        addToCart(token, fixture, 1);
        JsonNode oldOrder = placeOrder(token, addressId, "COD", null);
        addToCart(token, fixture, 1);
        JsonNode recentOrder = placeOrder(token, addressId, "COD", null);
        UUID oldSeller = sellerOrderId(oldOrder, 0);
        UUID recentSeller = sellerOrderId(recentOrder, 0);
        jdbc.update("UPDATE seller_orders SET status='DELIVERED',delivered_at=? WHERE id=?",
                Timestamp.from(now.minus(8, ChronoUnit.DAYS)), oldSeller);
        jdbc.update("UPDATE seller_orders SET status='DELIVERED',delivered_at=? WHERE id=?",
                Timestamp.from(now.minus(2, ChronoUnit.DAYS)), recentSeller);
        long payout = jdbc.queryForObject("SELECT payout_vnd FROM seller_orders WHERE id=?", Long.class, oldSeller);

        MvcResult generated = mockMvc.perform(post("/api/v1/admin/settlements/generate")
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"brandId\":\"" + brandId + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].brandId").value(brandId.toString()))
                .andExpect(jsonPath("$.data[0].brandName").value(fixture.owner().brand().getName()))
                .andExpect(jsonPath("$.data[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data[0].orderCount").value(1))
                .andExpect(jsonPath("$.data[0].payoutVnd").value(payout))
                .andExpect(jsonPath("$.data[0].createdAt").exists())
                .andExpect(jsonPath("$.data[0].brand_id").doesNotExist())
                .andExpect(jsonPath("$.data[0].payout_vnd").doesNotExist())
                .andReturn();
        String settlementId = data(generated).get(0).get("id").asText();

        assertThat(jdbc.queryForObject("SELECT settlement_id FROM seller_orders WHERE id=?", UUID.class, oldSeller))
                .isEqualTo(UUID.fromString(settlementId));
        assertThat(jdbc.queryForObject("SELECT settlement_id FROM seller_orders WHERE id=?", UUID.class, recentSeller))
                .isNull();

        mockMvc.perform(post("/api/v1/admin/settlements/{id}/mark-paid", settlementId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"payoutRef\":\"VCB-123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(settlementId))
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.payoutRef").value("VCB-123"))
                .andExpect(jsonPath("$.data.paidAt").exists())
                .andExpect(jsonPath("$.data.orderCount").value(1));

        mockMvc.perform(post("/api/v1/admin/settlements/{id}/mark-paid", settlementId)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"payoutRef\":\"VCB-123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATUS_TRANSITION"));

        mockMvc.perform(get("/api/v1/admin/settlements")
                        .param("status", "PAID")
                        .param("brandId", brandId.toString())
                        .with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].brandName").value(fixture.owner().brand().getName()));

        FitMeUserPrincipal seller = new FitMeUserPrincipal(fixture.owner().user());
        mockMvc.perform(get("/api/v1/brand/settlements").with(user(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(settlementId))
                .andExpect(jsonPath("$.data[0].payoutRef").value("VCB-123"));
        mockMvc.perform(get("/api/v1/brand/settlements/summary").with(user(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paidVnd").value(payout))
                .andExpect(jsonPath("$.data.eligibleVnd").value(0))
                .andExpect(jsonPath("$.data.pendingVnd").value(payout))
                .andExpect(jsonPath("$.data.nextEligibleAt").exists());
    }
}
