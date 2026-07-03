package com.fitme.billing.payos;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "fitme.payos.mock", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class MockPayOsClient implements PayOsClient {

    private final FitMeProperties fitMeProperties;
    private final ObjectMapper objectMapper;

    @Override
    public PayOsPaymentLink createPaymentLink(long orderCode, long amountVnd, String description) {
        String base = fitMeProperties.getPayos().getReturnUrl();
        String separator = base.contains("?") ? "&" : "?";
        return PayOsPaymentLink.builder()
                .paymentLinkId("mock-" + orderCode)
                .checkoutUrl(base + separator + "orderCode=" + orderCode + "&mock=1")
                .build();
    }

    @Override
    public long verifyAndParseWebhook(String rawWebhookBody) {
        try {
            JsonNode root = objectMapper.readTree(rawWebhookBody);
            if (root.has("data") && root.get("data").has("orderCode")) {
                return root.get("data").get("orderCode").asLong();
            }
            if (root.has("orderCode")) {
                return root.get("orderCode").asLong();
            }
        } catch (Exception ignored) {
            // fall through
        }
        throw new BusinessException("Webhook mock không hợp lệ");
    }
}
