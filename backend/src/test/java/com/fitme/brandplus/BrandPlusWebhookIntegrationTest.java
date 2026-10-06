package com.fitme.brandplus;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import vn.payos.crypto.CryptoProviderImpl;
import vn.payos.model.webhooks.WebhookData;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Brand Plus PayOS webhooks through the live SDK client (signature verification on). Same properties as
 * P0BillingWebhookIntegrationTest so both share one Spring context.
 */
@TestPropertySource(properties = {
        "fitme.payos.mock=false",
        "fitme.payos.client-id=test-client-id",
        "fitme.payos.api-key=test-api-key",
        "fitme.payos.checksum-key=" + BrandPlusWebhookIntegrationTest.CHECKSUM_KEY
})
class BrandPlusWebhookIntegrationTest extends AbstractIntegrationTest {

    static final String CHECKSUM_KEY = "p0-test-checksum-key-0123456789abcdef";
    private static final long AMOUNT = 999_000;

    @Autowired
    private TestDataHelper testData;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void signedPaidWebhookActivatesThirtyDays() throws Exception {
        UUID brandId = testData.createBrandOwner().brand().getId();
        long orderCode = pendingOrder(brandId);

        sendWebhook(webhook(orderCode, "00", AMOUNT, CHECKSUM_KEY)).andExpect(status().isOk());

        assertThat(orderStatus(orderCode)).isEqualTo("PAID");
        assertThat(jdbc.queryForObject("SELECT paid_at IS NOT NULL FROM brand_billing_orders WHERE order_code = ?",
                Boolean.class, orderCode)).isTrue();
        assertThat(subscriptionStatus(brandId)).isEqualTo("ACTIVE");
        assertThat(endsAt(brandId)).isCloseTo(Instant.now().plus(30, ChronoUnit.DAYS), within(2, ChronoUnit.MINUTES));
        assertThat(jdbc.queryForObject("SELECT last_order_id = (SELECT id FROM brand_billing_orders WHERE order_code = ?) "
                + "FROM brand_subscriptions WHERE brand_id = ?", Boolean.class, orderCode, brandId)).isTrue();
    }

    @Test
    void secondPaidOrderStacksOnTheCurrentPeriod() throws Exception {
        UUID brandId = testData.createBrandOwner().brand().getId();
        long first = pendingOrder(brandId);
        long second = pendingOrder(brandId);

        sendWebhook(webhook(first, "00", AMOUNT, CHECKSUM_KEY)).andExpect(status().isOk());
        Instant firstEnd = endsAt(brandId);
        Instant firstStart = startsAt(brandId);
        sendWebhook(webhook(second, "00", AMOUNT, CHECKSUM_KEY)).andExpect(status().isOk());

        assertThat(endsAt(brandId)).isEqualTo(firstEnd.plus(30, ChronoUnit.DAYS));
        assertThat(startsAt(brandId)).isEqualTo(firstStart);
        assertThat(orderStatus(second)).isEqualTo("PAID");
    }

    @Test
    void duplicateWebhookIsIdempotent() throws Exception {
        UUID brandId = testData.createBrandOwner().brand().getId();
        long orderCode = pendingOrder(brandId);
        ObjectNode paid = webhook(orderCode, "00", AMOUNT, CHECKSUM_KEY);

        sendWebhook(paid).andExpect(status().isOk());
        Instant end = endsAt(brandId);
        Timestamp paidAt = jdbc.queryForObject("SELECT paid_at FROM brand_billing_orders WHERE order_code = ?",
                Timestamp.class, orderCode);
        sendWebhook(paid).andExpect(status().isOk());

        assertThat(endsAt(brandId)).isEqualTo(end);
        assertThat(jdbc.queryForObject("SELECT paid_at FROM brand_billing_orders WHERE order_code = ?",
                Timestamp.class, orderCode)).isEqualTo(paidAt);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_subscriptions WHERE brand_id = ?",
                Long.class, brandId)).isEqualTo(1);
    }

    @Test
    void forgedSignatureIsRejectedAndOrderStaysPending() throws Exception {
        UUID brandId = testData.createBrandOwner().brand().getId();
        long orderCode = pendingOrder(brandId);
        ObjectNode forged = webhook(orderCode, "00", AMOUNT, CHECKSUM_KEY);
        forged.put("signature", "0".repeat(64));

        sendWebhook(forged)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Webhook PayOS không hợp lệ"));
        sendWebhook(webhook(orderCode, "00", AMOUNT, "attacker-guessed-key")).andExpect(status().isBadRequest());

        assertThat(orderStatus(orderCode)).isEqualTo("PENDING");
        assertNoSubscription(brandId);
    }

    @Test
    void failedThenShortThenFullPayment() throws Exception {
        UUID brandId = testData.createBrandOwner().brand().getId();
        long orderCode = pendingOrder(brandId);

        sendWebhook(webhook(orderCode, "01", AMOUNT, CHECKSUM_KEY)).andExpect(status().isOk());
        assertThat(orderStatus(orderCode)).isEqualTo("FAILED");
        assertNoSubscription(brandId);

        sendWebhook(webhook(orderCode, "00", 1_000, CHECKSUM_KEY)).andExpect(status().isOk());
        assertThat(orderStatus(orderCode)).isEqualTo("FAILED");
        assertNoSubscription(brandId);

        sendWebhook(webhook(orderCode, "00", AMOUNT, CHECKSUM_KEY)).andExpect(status().isOk());
        assertThat(orderStatus(orderCode)).isEqualTo("PAID");
        assertThat(subscriptionStatus(brandId)).isEqualTo("ACTIVE");
    }

    /** Live mode cannot create a real PayOS link here, so the pending checkout is inserted in SQL. */
    private long pendingOrder(UUID brandId) {
        return jdbc.queryForObject("INSERT INTO brand_billing_orders (brand_id, plan_id, list_price, amount, status) "
                        + "SELECT ?, id, price_vnd, ?, 'PENDING' FROM billing_plans WHERE code = 'BRAND_PLUS' "
                        + "RETURNING order_code",
                Long.class, brandId, AMOUNT);
    }

    private ObjectNode webhook(long orderCode, String code, long amount, String signingKey) {
        WebhookData data = WebhookData.builder()
                .orderCode(orderCode)
                .amount(amount)
                .description("FitMe Brand Plus")
                .accountNumber("0000000000")
                .reference("REF" + orderCode)
                .transactionDateTime("2026-10-07 10:00:00")
                .currency("VND")
                .paymentLinkId("plink-" + orderCode)
                .code(code)
                .desc("00".equals(code) ? "success" : "failed")
                .build();
        ObjectNode body = objectMapper.createObjectNode();
        body.put("code", "00");
        body.put("desc", "success");
        body.put("success", true);
        body.set("data", objectMapper.valueToTree(data));
        body.put("signature", new CryptoProviderImpl().createSignatureFromObj(data, signingKey));
        return body;
    }

    private ResultActions sendWebhook(ObjectNode body) throws Exception {
        return mockMvc.perform(post("/api/v1/webhooks/payos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()));
    }

    private String orderStatus(long orderCode) {
        return jdbc.queryForObject("SELECT status FROM brand_billing_orders WHERE order_code = ?",
                String.class, orderCode);
    }

    private String subscriptionStatus(UUID brandId) {
        return jdbc.queryForObject("SELECT status FROM brand_subscriptions WHERE brand_id = ?", String.class, brandId);
    }

    private Instant endsAt(UUID brandId) {
        return jdbc.queryForObject("SELECT ends_at FROM brand_subscriptions WHERE brand_id = ?",
                Timestamp.class, brandId).toInstant();
    }

    private Instant startsAt(UUID brandId) {
        return jdbc.queryForObject("SELECT starts_at FROM brand_subscriptions WHERE brand_id = ?",
                Timestamp.class, brandId).toInstant();
    }

    private void assertNoSubscription(UUID brandId) {
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_subscriptions WHERE brand_id = ?",
                Long.class, brandId)).isZero();
    }
}
