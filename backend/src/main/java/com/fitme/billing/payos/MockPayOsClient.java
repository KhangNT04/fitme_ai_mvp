package com.fitme.billing.payos;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "fitme.payos.mock", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class MockPayOsClient implements PayOsClient {

    private final ObjectMapper objectMapper;

    @Override
    public PayOsPaymentLink createPaymentLink(long orderCode, long amountVnd, String description,
                                              String returnUrl, String cancelUrl) {
        String base = returnUrl;
        String separator = base.contains("?") ? "&" : "?";
        return PayOsPaymentLink.builder()
                .paymentLinkId("mock-" + orderCode)
                .checkoutUrl(base + separator + "orderCode=" + orderCode + "&mock=1")
                .build();
    }

    @Override
    public PayOsWebhookEvent verifyAndParseWebhook(String rawWebhookBody) {
        try {
            JsonNode root = objectMapper.readTree(rawWebhookBody);
            JsonNode node = root.has("data") && root.get("data").has("orderCode") ? root.get("data") : root;
            if (node.has("orderCode")) {
                boolean paid = !node.has("code") || PayOsWebhookEvent.SUCCESS_CODE.equals(node.get("code").asText());
                Long amount = node.has("amount") ? node.get("amount").asLong() : null;
                return new PayOsWebhookEvent(node.get("orderCode").asLong(), paid, amount);
            }
        } catch (Exception ignored) {
            // fall through
        }
        throw new BusinessException("Webhook mock không hợp lệ");
    }
}
