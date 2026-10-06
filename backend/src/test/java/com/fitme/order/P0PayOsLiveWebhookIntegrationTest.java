package com.fitme.order;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import vn.payos.crypto.CryptoProviderImpl;
import vn.payos.model.webhooks.WebhookData;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Runs the PayOS webhook through the live SDK client (signature verification on), not the mock. */
@TestPropertySource(properties = {
        "fitme.payos.mock=false",
        "fitme.payos.client-id=test-client-id",
        "fitme.payos.api-key=test-api-key",
        "fitme.payos.checksum-key=" + P0PayOsLiveWebhookIntegrationTest.CHECKSUM_KEY
})
class P0PayOsLiveWebhookIntegrationTest extends CommerceIntegrationSupport {

    static final String CHECKSUM_KEY = "p0-test-checksum-key-0123456789abcdef";

    /** PAY-07 */
    @Test
    void forgedWebhookSignature_isRejectedAndOrderUnchanged() throws Exception {
        PendingOrder order = pendingPayosOrder();
        ObjectNode forged = webhook(order, "00", order.totalVnd(), CHECKSUM_KEY);
        forged.put("signature", "0".repeat(64));

        sendWebhook(forged)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Webhook PayOS không hợp lệ"));
        sendWebhook(webhook(order, "00", order.totalVnd(), "attacker-guessed-key"))
                .andExpect(status().isBadRequest());
        ObjectNode unsigned = webhook(order, "00", order.totalVnd(), CHECKSUM_KEY);
        unsigned.remove("signature");
        sendWebhook(unsigned).andExpect(status().isBadRequest());

        assertUnpaid(order);
    }

    /** PAY-08 (live client): a correctly signed webhook whose result code is a failure never marks the order paid. */
    @Test
    void signedFailureWebhook_doesNotMarkOrderPaid_whileSignedSuccessDoes() throws Exception {
        PendingOrder order = pendingPayosOrder();

        sendWebhook(webhook(order, "01", order.totalVnd(), CHECKSUM_KEY)).andExpect(status().isOk());
        assertUnpaid(order);

        sendWebhook(webhook(order, "00", order.totalVnd(), CHECKSUM_KEY)).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT payment_status FROM orders WHERE id = ?", String.class, order.id()))
                .isEqualTo("PAID");
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, order.id()))
                .isEqualTo("CONFIRMED");
    }

    private record PendingOrder(UUID id, long payosOrderCode, long totalVnd) {}

    /** Live mode cannot create a real PayOS link here, so a COD order is turned into an unpaid PayOS order in SQL. */
    private PendingOrder pendingPayosOrder() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(3);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        UUID orderId = UUID.fromString(placeOrder(token, addressId, "COD", null).at("/order/id").asText());
        long payosOrderCode = 100_000_000_000L + Math.floorMod(System.nanoTime(), 900_000_000_000L);
        jdbc.update("UPDATE orders SET payment_method = 'PAYOS', status = 'PENDING_PAYMENT', payment_status = 'UNPAID', "
                + "payos_order_code = ? WHERE id = ?", payosOrderCode, orderId);
        long total = jdbc.queryForObject("SELECT total_vnd FROM orders WHERE id = ?", Long.class, orderId);
        return new PendingOrder(orderId, payosOrderCode, total);
    }

    private ObjectNode webhook(PendingOrder order, String code, long amount, String signingKey) {
        WebhookData data = WebhookData.builder()
                .orderCode(order.payosOrderCode())
                .amount(amount)
                .description("FitMe " + order.payosOrderCode())
                .accountNumber("0000000000")
                .reference("REF" + order.payosOrderCode())
                .transactionDateTime("2026-10-07 10:00:00")
                .currency("VND")
                .paymentLinkId("plink-" + order.payosOrderCode())
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

    private void assertUnpaid(PendingOrder order) {
        assertThat(jdbc.queryForObject("SELECT payment_status FROM orders WHERE id = ?", String.class, order.id()))
                .isEqualTo("UNPAID");
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, order.id()))
                .isEqualTo("PENDING_PAYMENT");
        assertThat(jdbc.queryForObject("SELECT paid_at IS NULL FROM orders WHERE id = ?", Boolean.class, order.id()))
                .isTrue();
    }
}
