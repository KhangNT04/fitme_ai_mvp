package com.fitme.billing.service;

import com.fitme.billing.dto.BillingPlanDto;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.entity.BrandBillingOrder;
import com.fitme.billing.entity.BrandQuotaBalance;
import com.fitme.billing.entity.BrandSubscription;
import com.fitme.billing.dto.AdminBrandBillingDetailDto;
import com.fitme.billing.dto.BrandBillingSummaryDto;
import com.fitme.billing.dto.CheckoutResponse;
import com.fitme.billing.payos.PayOsClient;
import com.fitme.billing.payos.PayOsPaymentLink;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.repository.BrandBillingOrderRepository;
import com.fitme.billing.repository.BrandSubscriptionRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.BillingOrderStatus;
import com.fitme.common.enums.BrandSubscriptionStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class BrandBillingService {

    private final BillingPlanRepository planRepository;
    private final BrandBillingOrderRepository orderRepository;
    private final BrandSubscriptionRepository subscriptionRepository;
    private final BrandRepository brandRepository;
    private final BrandQuotaService quotaService;
    private final PayOsClient payOsClient;
    private final FitMeProperties fitMeProperties;
    private final BillingDtoMapper dtoMapper;

    public BrandBillingSummaryDto getSummary(UUID brandId) {
        BrandQuotaBalance balance = quotaService.getOrCreateBalance(brandId);
        BrandBillingSummaryDto.SubscriptionInfo subscriptionInfo = subscriptionRepository.findByBrandId(brandId)
                .map(sub -> {
                    BillingPlan plan = planRepository.findById(sub.getPlanId()).orElse(null);
                    return BrandBillingSummaryDto.SubscriptionInfo.builder()
                            .planId(sub.getPlanId())
                            .planName(plan != null ? plan.getName() : null)
                            .status(sub.getStatus())
                            .startsAt(sub.getStartsAt())
                            .expiresAt(sub.getExpiresAt())
                            .build();
                })
                .orElse(null);

        return BrandBillingSummaryDto.builder()
                .brandId(brandId)
                .subscriptionRemaining(balance.getSubscriptionRemaining())
                .topupRemaining(balance.getTopupRemaining())
                .totalRemaining(balance.totalRemaining())
                .dashboardEnabled(quotaService.hasDashboardAccess(brandId))
                .subscription(subscriptionInfo)
                .recentOrders(orderRepository.findTop10ByBrandIdOrderByCreatedAtDesc(brandId).stream()
                        .map(order -> {
                            BillingPlan plan = planRepository.findById(order.getPlanId()).orElse(null);
                            return BrandBillingSummaryDto.RecentOrderDto.builder()
                                    .id(order.getId())
                                    .planName(plan != null ? plan.getName() : null)
                                    .planType(plan != null ? plan.getPlanType() : null)
                                    .amountVnd(order.getAmountVnd())
                                    .status(order.getStatus())
                                    .createdAt(order.getCreatedAt())
                                    .paidAt(order.getPaidAt())
                                    .build();
                        })
                        .toList())
                .build();
    }

    public AdminBrandBillingDetailDto getAdminDetail(UUID brandId) {
        Brand brand = brandRepository.findById(brandId)
                .orElseThrow(() -> new NotFoundException("Thương hiệu không tồn tại"));
        BrandBillingSummaryDto summary = getSummary(brandId);
        boolean billingActive = summary.getTotalRemaining() > 0
                || (summary.getSubscription() != null
                && summary.getSubscription().getStatus() == BrandSubscriptionStatus.ACTIVE);
        return AdminBrandBillingDetailDto.builder()
                .brandId(brand.getId())
                .brandName(brand.getName())
                .contactEmail(brand.getContactEmail())
                .brandStatus(brand.getStatus().name())
                .subscriptionRemaining(summary.getSubscriptionRemaining())
                .topupRemaining(summary.getTopupRemaining())
                .totalRemaining(summary.getTotalRemaining())
                .dashboardEnabled(summary.isDashboardEnabled())
                .billingActive(billingActive)
                .subscription(summary.getSubscription())
                .recentOrders(summary.getRecentOrders())
                .build();
    }

    @Transactional
    public CheckoutResponse createCheckout(UUID brandId, UUID planId) {
        BillingPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new NotFoundException("Gói không tồn tại"));
        if (!plan.isActive()) {
            throw new BusinessException("Gói không còn khả dụng");
        }

        long orderCode = nextOrderCode();
        BrandBillingOrder order = BrandBillingOrder.builder()
                .brandId(brandId)
                .planId(plan.getId())
                .amountVnd(plan.getPriceVnd())
                .status(BillingOrderStatus.PENDING)
                .payosOrderCode(orderCode)
                .build();
        order = orderRepository.save(order);

        PayOsPaymentLink link = payOsClient.createPaymentLink(orderCode, plan.getPriceVnd(),
                "FitMe " + plan.getName());
        order.setPayosPaymentLinkId(link.paymentLinkId());
        order.setCheckoutUrl(link.checkoutUrl());
        orderRepository.save(order);

        boolean mockPaid = fitMeProperties.getPayos().isMock();
        if (mockPaid) {
            quotaService.grantFromOrder(order);
        }

        return CheckoutResponse.builder()
                .orderId(order.getId())
                .payosOrderCode(orderCode)
                .checkoutUrl(link.checkoutUrl())
                .mockPaid(mockPaid)
                .build();
    }

    @Transactional
    public void handleWebhook(String rawBody) {
        long orderCode = payOsClient.extractPaidOrderCode(rawBody);
        BrandBillingOrder order = orderRepository.findByPayosOrderCode(orderCode)
                .orElseThrow(() -> new NotFoundException("Đơn thanh toán không tồn tại"));
        quotaService.grantFromOrder(order);
    }

    @Transactional
    public void confirmMockPayment(long orderCode) {
        BrandBillingOrder order = orderRepository.findByPayosOrderCode(orderCode)
                .orElseThrow(() -> new NotFoundException("Đơn thanh toán không tồn tại"));
        quotaService.grantFromOrder(order);
    }

    @Transactional
    public void grantSeedEntitlement(UUID brandId, String planCode) {
        if (quotaService.hasTryOnQuota(brandId)) {
            return;
        }
        BillingPlan plan = planRepository.findByCode(planCode)
                .orElseThrow(() -> new NotFoundException("Gói seed không tồn tại: " + planCode));
        BrandBillingOrder order = BrandBillingOrder.builder()
                .brandId(brandId)
                .planId(plan.getId())
                .amountVnd(0)
                .status(BillingOrderStatus.PENDING)
                .payosOrderCode(nextOrderCode())
                .build();
        order = orderRepository.save(order);
        quotaService.grantFromOrder(order);
    }

    private long nextOrderCode() {
        long base = System.currentTimeMillis() % 9_000_000_000L;
        return base * 10L + ThreadLocalRandom.current().nextInt(10);
    }
}
