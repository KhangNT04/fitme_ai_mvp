package com.fitme.billing.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AdminBrandBillingDetailDto {
    private UUID brandId;
    private String brandName;
    private String contactEmail;
    private String brandStatus;
    private int subscriptionRemaining;
    private int topupRemaining;
    private int totalRemaining;
    private boolean dashboardEnabled;
    private boolean billingActive;
    private BrandBillingSummaryDto.SubscriptionInfo subscription;
    private List<BrandBillingSummaryDto.RecentOrderDto> recentOrders;
}
