package com.fitme.analytics.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/** Aggregates only: no customer names, emails or ids (those are only on /brand/leads for Brand Plus). */
@Data
@Builder
public class BrandDashboardResponse {
    private long totalProducts;
    private long activeProducts;
    private long aiRecommendedProducts;
    private long buyClicks;
    private double clickThroughRate;
    private long tryOnAttempts;
    private double tryOnToBuyRate;
    /** Distinct customers (signed-in user, else anonymous session) who tried on the brand's products. */
    private long tryOnCustomers7d;
    private long tryOnCustomers30d;
    /** Top 10 products by distinct try-on customers in the last 30 days. */
    private List<ProductCustomers> topTryOnProducts;
    private CustomerFunnel funnel30d;

    public record ProductCustomers(UUID productId, String productName, long customers) {
    }

    /** Last 30 days: try-on customers, customers who clicked buy, and leads the brand confirmed as sold. */
    public record CustomerFunnel(long tryOnCustomers, long buyClickCustomers, long soldLeads) {
    }
}
