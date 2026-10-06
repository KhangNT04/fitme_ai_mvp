package com.fitme.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.common.enums.VoucherStatus;
import com.fitme.voucher.entity.UserVoucher;
import com.fitme.voucher.repository.UserVoucherRepository;
import com.fitme.voucher.service.VoucherService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OrderIntegrationTest extends CommerceIntegrationSupport {
    @Autowired VoucherService voucherService;
    @Autowired UserVoucherRepository voucherRepository;

    @Test
    void checkoutCod_appliesFreeshipVoucher_andConsumesIt() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(5);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 2);
        UserVoucher voucher = grantVoucher(token);

        JsonNode checkout = placeOrder(token, addressId, "COD", voucher.getId());

        assertThat(checkout.at("/order/status").asText()).isEqualTo("CONFIRMED");
        assertThat(checkout.at("/order/paymentStatus").asText()).isEqualTo("UNPAID");
        assertThat(checkout.at("/order/shippingFeeVnd").asLong()).isEqualTo(30_000);
        assertThat(checkout.at("/order/discountVnd").asLong()).isEqualTo(30_000);
        assertThat(voucherRepository.findById(voucher.getId()).orElseThrow().getStatus()).isEqualTo(VoucherStatus.USED);
        assertThat(variants.findById(fixture.variant().getId()).orElseThrow().getStockQuantity()).isEqualTo(3);
    }

    @Test
    void payosReturnAndWebhook_markPaidIdempotently() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(4);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        JsonNode checkout = placeOrder(token, addressId, "PAYOS", null);
        UUID orderId = UUID.fromString(checkout.at("/order/id").asText());
        long payosCode = jdbc.queryForObject("SELECT payos_order_code FROM orders WHERE id=?", Long.class, orderId);

        mockMvc.perform(post("/api/v1/orders/payos/return")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderCode\":" + payosCode + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PAID"));

        String webhook = "{\"data\":{\"orderCode\":" + payosCode + "}}";
        mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON).content(webhook))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON).content(webhook))
                .andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT count(*) FROM payment_transactions WHERE order_id=?", Long.class, orderId))
                .isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT payment_status FROM orders WHERE id=?", String.class, orderId))
                .isEqualTo("PAID");
    }

    @Test
    void payosWebhook_ignoresFailedAndUnderpaidTransactions() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(4);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        UUID orderId = UUID.fromString(placeOrder(token, addressId, "PAYOS", null).at("/order/id").asText());
        long payosCode = jdbc.queryForObject("SELECT payos_order_code FROM orders WHERE id=?", Long.class, orderId);
        long total = jdbc.queryForObject("SELECT total_vnd FROM orders WHERE id=?", Long.class, orderId);

        for (String data : new String[]{
                "{\"orderCode\":%d,\"code\":\"01\",\"amount\":%d}".formatted(payosCode, total),
                "{\"orderCode\":%d,\"code\":\"00\",\"amount\":%d}".formatted(payosCode, total - 1)}) {
            mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"data\":" + data + "}"))
                    .andExpect(status().isOk());
            assertThat(jdbc.queryForObject("SELECT payment_status FROM orders WHERE id=?", String.class, orderId))
                    .isEqualTo("UNPAID");
        }

        mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"data\":{\"orderCode\":%d,\"code\":\"00\",\"amount\":%d}}".formatted(payosCode, total)))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT payment_status FROM orders WHERE id=?", String.class, orderId))
                .isEqualTo("PAID");
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id=?", String.class, orderId))
                .isEqualTo("CONFIRMED");
    }

    @Test
    void cancel_restoresStock_releasesVoucher_andDeniesOtherUser() throws Exception {
        String token = registerUserAccessToken();
        String other = registerUserAccessToken();
        ProductFixture fixture = productFixture(2);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 2);
        UserVoucher voucher = grantVoucher(token);
        UUID orderId = UUID.fromString(placeOrder(token, addressId, "COD", voucher.getId()).at("/order/id").asText());

        mockMvc.perform(get("/api/v1/orders/{id}", orderId)
                        .header("Authorization", "Bearer " + other))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/orders/{id}/cancel", orderId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Đổi ý\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        assertThat(variants.findById(fixture.variant().getId()).orElseThrow().getStockQuantity()).isEqualTo(2);
        assertThat(voucherRepository.findById(voucher.getId()).orElseThrow().getStatus()).isEqualTo(VoucherStatus.AVAILABLE);
    }

    @Test
    void paymentTimeout_cancelsOrder_restoresStock_andVoucher() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(2);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        UserVoucher voucher = grantVoucher(token);
        UUID orderId = UUID.fromString(placeOrder(token, addressId, "PAYOS", voucher.getId()).at("/order/id").asText());
        backdateOrder(orderId);

        paymentTimeoutJob.cancelExpiredPayments();

        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id=?", String.class, orderId))
                .isEqualTo("CANCELLED");
        assertThat(variants.findById(fixture.variant().getId()).orElseThrow().getStockQuantity()).isEqualTo(2);
        assertThat(voucherRepository.findById(voucher.getId()).orElseThrow().getStatus()).isEqualTo(VoucherStatus.AVAILABLE);
    }

    @Test
    void preview_returnsCamelCaseCartItems_groupedBySeller() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture first = productFixture(5);
        ProductFixture second = productFixture(5);
        addToCart(token, first, 2);
        addToCart(token, second, 1);
        UserVoucher voucher = grantVoucher(token);
        long unitPrice = first.product().getPrice().longValue();

        mockMvc.perform(post("/api/v1/orders/preview")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"voucherId\":\"" + voucher.getId() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups.length()").value(2))
                .andExpect(jsonPath("$.data.shippingFeeVnd").value(60_000))
                .andExpect(jsonPath("$.data.discountVnd").value(30_000))
                .andExpect(jsonPath("$.data.voucher.id").value(voucher.getId().toString()))
                .andExpect(jsonPath("$.data.voucher.voucherType").value("FREESHIP"))
                .andExpect(jsonPath("$.data.voucher.maxDiscountVnd").value(30_000))
                .andExpect(jsonPath("$.data.groups[0].shippingFeeVnd").value(30_000))
                .andExpect(jsonPath("$.data.groups[?(@.brandId=='%s')].items[0].productId"
                        .formatted(first.owner().brand().getId())).value(first.product().getId().toString()))
                .andExpect(jsonPath("$.data.groups[?(@.brandId=='%s')].items[0].unitPriceVnd"
                        .formatted(first.owner().brand().getId())).value((int) unitPrice))
                .andExpect(jsonPath("$.data.groups[?(@.brandId=='%s')].items[0].lineTotalVnd"
                        .formatted(first.owner().brand().getId())).value((int) (unitPrice * 2)))
                .andExpect(jsonPath("$.data.groups[0].items[0].variantId").exists())
                .andExpect(jsonPath("$.data.groups[0].items[0].stockQuantity").value(5))
                .andExpect(jsonPath("$.data.groups[0].items[0].available").value(true))
                .andExpect(jsonPath("$.data.groups[0].items[0].product_id").doesNotExist())
                .andExpect(jsonPath("$.data.groups[0].items[0].price").doesNotExist())
                .andExpect(jsonPath("$.data.groups[0].brand_id").doesNotExist());
    }

    @Test
    void latePayosPayment_afterTimeoutCancel_isRecordedForRefund() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(2);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        UserVoucher voucher = grantVoucher(token);
        UUID orderId = UUID.fromString(placeOrder(token, addressId, "PAYOS", voucher.getId()).at("/order/id").asText());
        long payosCode = jdbc.queryForObject("SELECT payos_order_code FROM orders WHERE id=?", Long.class, orderId);
        backdateOrder(orderId);
        paymentTimeoutJob.cancelExpiredPayments();

        mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"data\":{\"orderCode\":" + payosCode + "}}"))
                .andExpect(status().isOk());

        long total = jdbc.queryForObject("SELECT total_vnd FROM orders WHERE id=?", Long.class, orderId);
        mockMvc.perform(get("/api/v1/orders/{id}", orderId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.data.refundDueVnd").value(total));
        assertThat(jdbc.queryForObject("SELECT status FROM payment_transactions WHERE order_id=?", String.class, orderId))
                .isEqualTo("PAID");
        assertThat(jdbc.queryForObject("SELECT paid_at IS NOT NULL FROM orders WHERE id=?", Boolean.class, orderId))
                .isTrue();
        assertThat(variants.findById(fixture.variant().getId()).orElseThrow().getStockQuantity()).isEqualTo(2);
        assertThat(voucherRepository.findById(voucher.getId()).orElseThrow().getStatus()).isEqualTo(VoucherStatus.AVAILABLE);

        mockMvc.perform(post("/api/v1/orders/{id}/cancel", orderId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("ORDER_NOT_CANCELLABLE"));
    }

    private UserVoucher grantVoucher(String token) {
        return voucherService.grantFreeship(userId(token), 1, 30_000,
                Instant.now().plus(7, ChronoUnit.DAYS), VoucherService.SOURCE_ADMIN, UUID.randomUUID()).getFirst();
    }
}
