package com.fitme.billing.dto;

import com.fitme.common.enums.BillingOrderStatus;
import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.enums.BrandSubscriptionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class BrandBillingSummaryDto {
    private UUID brandId;
    private int subscriptionRemaining;
    private int topupRemaining;
    private int totalRemaining;
    private boolean dashboardEnabled;
    private SubscriptionInfo subscription;
    private List<RecentOrderDto> recentOrders;

    @Data
    @Builder
    public static class SubscriptionInfo {
        private UUID planId;
        private String planName;
        private BrandSubscriptionStatus status;
        private Instant startsAt;
        private Instant expiresAt;
    }

    @Data
    @Builder
    public static class RecentOrderDto {
        private UUID id;
        private String planName;
        private BillingPlanType planType;
        private long amountVnd;
        private BillingOrderStatus status;
        private Instant createdAt;
        private Instant paidAt;
    }
}
