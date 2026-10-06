package com.fitme.analytics.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PayingCustomersReport(
        long payingCustomers,
        long transactions,
        long totalRevenueVnd,
        /** Transactions known to be simulated (PayOS mock links); excluded from {@code liveRevenueVnd}. */
        long mockTransactions,
        long liveRevenueVnd,
        /** Whether the server currently runs PayOS in mock mode. */
        boolean payosMock,
        List<Row> rows
) {

    public enum Kind {
        PRO_SUBSCRIPTION
    }

    public record Row(
            Kind kind,
            UUID transactionId,
            String reference,
            Long payosOrderCode,
            long amountVnd,
            Instant paidAt,
            UUID userId,
            String customerName,
            String email,
            boolean mock
    ) {
    }
}
