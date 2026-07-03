package com.fitme.billing.payos;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;
import vn.payos.model.webhooks.WebhookData;

@Component
@ConditionalOnProperty(name = "fitme.payos.mock", havingValue = "false")
@RequiredArgsConstructor
public class LivePayOsClient implements PayOsClient {

    private final FitMeProperties fitMeProperties;
    private volatile PayOS payOs;

    @Override
    public PayOsPaymentLink createPaymentLink(long orderCode, long amountVnd, String description) {
        try {
            CreatePaymentLinkRequest request = CreatePaymentLinkRequest.builder()
                    .orderCode(orderCode)
                    .amount(amountVnd)
                    .description(trimDescription(description))
                    .returnUrl(fitMeProperties.getPayos().getReturnUrl())
                    .cancelUrl(fitMeProperties.getPayos().getCancelUrl())
                    .item(PaymentLinkItem.builder()
                            .name(trimDescription(description))
                            .quantity(1)
                            .price(amountVnd)
                            .build())
                    .build();
            CreatePaymentLinkResponse response = client().paymentRequests().create(request);
            return PayOsPaymentLink.builder()
                    .paymentLinkId(response.getPaymentLinkId())
                    .checkoutUrl(response.getCheckoutUrl())
                    .build();
        } catch (Exception e) {
            throw new BusinessException("Không thể tạo link thanh toán PayOS: " + e.getMessage());
        }
    }

    @Override
    public long extractPaidOrderCode(String rawWebhookBody) {
        try {
            WebhookData data = client().webhooks().verify(rawWebhookBody);
            return data.getOrderCode();
        } catch (Exception e) {
            throw new BusinessException("Webhook PayOS không hợp lệ");
        }
    }

    private PayOS client() {
        if (payOs == null) {
            synchronized (this) {
                if (payOs == null) {
                    var cfg = fitMeProperties.getPayos();
                    payOs = new PayOS(cfg.getClientId(), cfg.getApiKey(), cfg.getChecksumKey());
                }
            }
        }
        return payOs;
    }

    private static String trimDescription(String description) {
        if (description == null || description.isBlank()) {
            return "FitMe brand billing";
        }
        return description.length() > 25 ? description.substring(0, 25) : description;
    }
}
