package com.fitme.billing;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;
import vn.payos.crypto.CryptoProviderImpl;
import vn.payos.model.webhooks.WebhookData;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PayOS webhook security for the consumer Pro subscription, run through the live SDK client
 * (signature verification on), not the mock.
 */
@TestPropertySource(properties = {
        "fitme.payos.mock=false",
        "fitme.payos.client-id=test-client-id",
        "fitme.payos.api-key=test-api-key",
        "fitme.payos.checksum-key=" + P0BillingWebhookIntegrationTest.CHECKSUM_KEY
})
class P0BillingWebhookIntegrationTest extends AbstractIntegrationTest {

    static final String CHECKSUM_KEY = "p0-test-checksum-key-0123456789abcdef";
    private static final long PRO_PRICE_VND = 49_000;

    @Autowired
    private TestDataHelper testData;

    @Autowired
    private JdbcTemplate jdbc;

    /** PAY-07 */
    @Test
    void forgedWebhookSignature_isRejectedAndBillingOrderUnchanged() throws Exception {
        PendingOrder order = pendingProOrder();
        ObjectNode forged = webhook(order, "00", PRO_PRICE_VND, CHECKSUM_KEY);
        forged.put("signature", "0".repeat(64));

        sendWebhook(forged)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Webhook PayOS không hợp lệ"));
        sendWebhook(webhook(order, "00", PRO_PRICE_VND, "attacker-guessed-key"))
                .andExpect(status().isBadRequest());
        ObjectNode unsigned = webhook(order, "00", PRO_PRICE_VND, CHECKSUM_KEY);
        unsigned.remove("signature");
        sendWebhook(unsigned).andExpect(status().isBadRequest());

        assertUnpaid(order);
    }

    /** PAY-08: a correctly signed webhook with a failure code or a short amount never marks the order paid. */
    @Test
    void signedFailureWebhook_doesNotMarkOrderPaid_whileSignedSuccessDoes() throws Exception {
        PendingOrder order = pendingProOrder();

        sendWebhook(webhook(order, "01", PRO_PRICE_VND, CHECKSUM_KEY)).andExpect(status().isOk());
        assertUnpaid(order);
        sendWebhook(webhook(order, "00", 1_000, CHECKSUM_KEY)).andExpect(status().isOk());
        assertUnpaid(order);

        sendWebhook(webhook(order, "00", PRO_PRICE_VND, CHECKSUM_KEY)).andExpect(status().isOk());
        assertThat(billingStatus(order)).isEqualTo("PAID");
        assertThat(jdbc.queryForObject("SELECT paid_at IS NOT NULL FROM consumer_billing_orders WHERE id = ?",
                Boolean.class, order.id())).isTrue();
        mockMvc.perform(get("/api/v1/me/entitlement").with(user(order.principal())))
                .andExpect(jsonPath("$.data.plan").value("PRO"));
    }

    /** SUB-10 */
    @Test
    void subscriptionWebhookDeliveredTwice_creditsFitkenOnce() throws Exception {
        PendingOrder order = pendingProOrder();
        ObjectNode paid = webhook(order, "00", PRO_PRICE_VND, CHECKSUM_KEY);

        for (int i = 0; i < 2; i++) {
            sendWebhook(paid).andExpect(status().isOk());
        }

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM fitken_ledger WHERE reference_id = ? "
                + "AND entry_type = 'SUBSCRIPTION_GRANT'", Long.class, order.id())).isEqualTo(1);
        mockMvc.perform(get("/api/v1/me/fitken").with(user(order.principal())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subscriptionRemaining").value(15))
                .andExpect(jsonPath("$.data.plan").value("PRO"));
        assertThat(billingStatus(order)).isEqualTo("PAID");
    }

    private record PendingOrder(UUID id, long payosOrderCode, FitMeUserPrincipal principal) {}

    /** Live mode cannot create a real PayOS link here, so the pending checkout is inserted in SQL. */
    private PendingOrder pendingProOrder() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testData.createUser().user());
        long orderCode = 100_000_000_000L + Math.floorMod(System.nanoTime(), 900_000_000_000L);
        jdbc.update("INSERT INTO consumer_billing_orders (user_id, plan_id, amount_vnd, status, payos_order_code) "
                        + "VALUES (?, ?::uuid, ?, 'PENDING', ?)",
                principal.getUserId(), proPlanId(), PRO_PRICE_VND, orderCode);
        UUID id = jdbc.queryForObject(
                "SELECT id FROM consumer_billing_orders WHERE payos_order_code = ?", UUID.class, orderCode);
        return new PendingOrder(id, orderCode, principal);
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

    private String billingStatus(PendingOrder order) {
        return jdbc.queryForObject("SELECT status FROM consumer_billing_orders WHERE id = ?", String.class, order.id());
    }

    private void assertUnpaid(PendingOrder order) throws Exception {
        assertThat(billingStatus(order)).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT paid_at IS NULL FROM consumer_billing_orders WHERE id = ?",
                Boolean.class, order.id())).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM fitken_ledger WHERE reference_id = ?",
                Long.class, order.id())).isZero();
        mockMvc.perform(get("/api/v1/me/entitlement").with(user(order.principal())))
                .andExpect(jsonPath("$.data.plan").value("FREE"));
    }

    private String proPlanId() throws Exception {
        JsonNode plans = objectMapper.readTree(mockMvc.perform(get("/api/v1/plans"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data");
        for (JsonNode plan : plans) {
            if ("PRO_MONTHLY".equals(plan.get("code").asText())) {
                return plan.get("id").asText();
            }
        }
        throw new AssertionError("PRO_MONTHLY plan seeded by V18");
    }
}
