package com.fitme.billing.payos;

import lombok.Builder;

@Builder
public record PayOsPaymentLink(
        String paymentLinkId,
        String checkoutUrl
) {
}
