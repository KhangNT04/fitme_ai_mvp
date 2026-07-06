package com.fitme.billing.service;

import com.fitme.billing.entity.*;
import com.fitme.billing.repository.*;
import com.fitme.common.enums.*;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.service.ProductEligibilityService;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.UUID;

@Service
public class BrandQuotaService {

    public static final String REF_TRY_ON_REQUEST = "TRY_ON_REQUEST";
    public static final String REF_BILLING_ORDER = "BILLING_ORDER";

    private final BrandQuotaBalanceRepository balanceRepository;
    private final BrandQuotaLedgerRepository ledgerRepository;
    private final BrandSubscriptionRepository subscriptionRepository;
    private final BillingPlanRepository planRepository;
    private final BrandBillingOrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ProductEligibilityService eligibilityService;

    public BrandQuotaService(
            BrandQuotaBalanceRepository balanceRepository,
            BrandQuotaLedgerRepository ledgerRepository,
            BrandSubscriptionRepository subscriptionRepository,
            BillingPlanRepository planRepository,
            BrandBillingOrderRepository orderRepository,
            ProductRepository productRepository,
            @Lazy ProductEligibilityService eligibilityService) {
        this.balanceRepository = balanceRepository;
        this.ledgerRepository = ledgerRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.planRepository = planRepository;
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.eligibilityService = eligibilityService;
    }

    public boolean hasTryOnQuota(UUID brandId) {
        return getOrCreateBalance(brandId).totalRemaining() > 0;
    }

    public boolean hasDashboardAccess(UUID brandId) {
        return subscriptionRepository.findByBrandId(brandId)
                .filter(s -> s.getStatus() == BrandSubscriptionStatus.ACTIVE)
                .filter(s -> s.getExpiresAt().isAfter(Instant.now()))
                .flatMap(s -> planRepository.findById(s.getPlanId()))
                .map(BillingPlan::isIncludesDashboard)
                .orElse(false);
    }

    public void assertDashboardAccess(UUID brandId) {
        if (!hasDashboardAccess(brandId)) {
            throw new BusinessException("Cần gói tháng có dashboard để xem phân tích. Vui lòng đăng ký gói Starter, Growth hoặc Pro.");
        }
    }

    public BrandQuotaBalance getOrCreateBalance(UUID brandId) {
        return balanceRepository.findById(brandId)
                .orElseGet(() -> balanceRepository.save(BrandQuotaBalance.builder()
                        .brandId(brandId)
                        .subscriptionRemaining(0)
                        .topupRemaining(0)
                        .build()));
    }

    @Transactional
    public void grantFromOrder(BrandBillingOrder order) {
        if (order.getStatus() == BillingOrderStatus.PAID) {
            return;
        }
        BillingPlan plan = planRepository.findById(order.getPlanId())
                .orElseThrow(() -> new NotFoundException("Gói không tồn tại"));

        order.setStatus(BillingOrderStatus.PAID);
        order.setPaidAt(Instant.now());
        orderRepository.save(order);

        BrandQuotaBalance balance = getOrCreateBalance(order.getBrandId());
        if (plan.getPlanType() == BillingPlanType.SUBSCRIPTION) {
            int days = plan.getBillingPeriodDays() != null ? plan.getBillingPeriodDays() : 30;
            Instant now = Instant.now();
            BrandSubscription subscription = subscriptionRepository.findByBrandId(order.getBrandId())
                    .orElse(BrandSubscription.builder().brandId(order.getBrandId()).build());
            subscription.setPlanId(plan.getId());
            subscription.setStatus(BrandSubscriptionStatus.ACTIVE);
            subscription.setStartsAt(now);
            subscription.setExpiresAt(now.plus(days, ChronoUnit.DAYS));
            subscription.setLastOrderId(order.getId());
            subscriptionRepository.save(subscription);

            balance.setSubscriptionRemaining(balance.getSubscriptionRemaining() + plan.getQuotaAmount());
            appendLedger(order.getBrandId(), QuotaLedgerEntryType.SUBSCRIPTION_GRANT, plan.getQuotaAmount(),
                    balance.totalRemaining(), REF_BILLING_ORDER, order.getId(), "Gói " + plan.getName());
        } else {
            balance.setTopupRemaining(balance.getTopupRemaining() + plan.getQuotaAmount());
            appendLedger(order.getBrandId(), QuotaLedgerEntryType.TOPUP_GRANT, plan.getQuotaAmount(),
                    balance.totalRemaining(), REF_BILLING_ORDER, order.getId(), "Top-up " + plan.getName());
        }
        balanceRepository.save(balance);
        refreshBrandProductEligibility(order.getBrandId());
    }

    @Transactional
    public void precheckQuotaForBrands(Collection<UUID> brandIds) {
        for (UUID brandId : brandIds) {
            if (!hasTryOnQuota(brandId)) {
                throw new BusinessException("Một hoặc nhiều thương hiệu trong outfit đã hết lượt thử AI");
            }
        }
    }

    @Transactional
    public void consumeForTryOn(UUID tryOnRequestId, Collection<UUID> brandIds) {
        for (UUID brandId : brandIds) {
            if (ledgerRepository.existsByBrandIdAndEntryTypeAndReferenceTypeAndReferenceId(
                    brandId, QuotaLedgerEntryType.CONSUME, REF_TRY_ON_REQUEST, tryOnRequestId)) {
                continue;
            }
            BrandQuotaBalance balance = getOrCreateBalance(brandId);
            if (balance.totalRemaining() <= 0) {
                continue;
            }
            int subscriptionRemaining = balance.getSubscriptionRemaining();
            int topupRemaining = balance.getTopupRemaining();
            if (subscriptionRemaining > 0) {
                subscriptionRemaining--;
            } else {
                topupRemaining--;
            }
            int balanceAfter = subscriptionRemaining + topupRemaining;
            try {
                appendLedger(brandId, QuotaLedgerEntryType.CONSUME, -1, balanceAfter,
                        REF_TRY_ON_REQUEST, tryOnRequestId, "Try-on 2D");
            } catch (DataIntegrityViolationException ex) {
                if (ledgerRepository.existsByBrandIdAndEntryTypeAndReferenceTypeAndReferenceId(
                        brandId, QuotaLedgerEntryType.CONSUME, REF_TRY_ON_REQUEST, tryOnRequestId)) {
                    continue;
                }
                throw ex;
            }
            balance.setSubscriptionRemaining(subscriptionRemaining);
            balance.setTopupRemaining(topupRemaining);
            balanceRepository.save(balance);
            refreshBrandProductEligibility(brandId);
        }
    }

    @Transactional
    public void adjustQuota(UUID brandId, int subscriptionDelta, int topupDelta, String note) {
        BrandQuotaBalance balance = getOrCreateBalance(brandId);
        balance.setSubscriptionRemaining(Math.max(0, balance.getSubscriptionRemaining() + subscriptionDelta));
        balance.setTopupRemaining(Math.max(0, balance.getTopupRemaining() + topupDelta));
        balanceRepository.save(balance);
        int delta = subscriptionDelta + topupDelta;
        if (delta != 0) {
            appendLedger(brandId, QuotaLedgerEntryType.ADMIN_ADJUST, delta, balance.totalRemaining(),
                    "ADMIN", null, note);
        }
        refreshBrandProductEligibility(brandId);
    }

    @Transactional
    public void deactivateBrandBilling(UUID brandId, String note) {
        subscriptionRepository.findByBrandId(brandId).ifPresent(sub -> {
            if (sub.getStatus() == BrandSubscriptionStatus.ACTIVE) {
                sub.setStatus(BrandSubscriptionStatus.CANCELLED);
                subscriptionRepository.save(sub);
            }
        });
        BrandQuotaBalance balance = getOrCreateBalance(brandId);
        int removed = balance.totalRemaining();
        if (removed > 0) {
            balance.setSubscriptionRemaining(0);
            balance.setTopupRemaining(0);
            balanceRepository.save(balance);
            appendLedger(brandId, QuotaLedgerEntryType.ADMIN_REVOKE, -removed, 0,
                    "ADMIN", null, note != null && !note.isBlank() ? note : "Admin vô hiệu hóa gói brand");
        }
        refreshBrandProductEligibility(brandId);
    }

    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void expireSubscriptions() {
        Instant now = Instant.now();
        subscriptionRepository.findByStatusAndExpiresAtBefore(BrandSubscriptionStatus.ACTIVE, now)
                .forEach(sub -> {
                    sub.setStatus(BrandSubscriptionStatus.EXPIRED);
                    subscriptionRepository.save(sub);
                    BrandQuotaBalance balance = getOrCreateBalance(sub.getBrandId());
                    if (balance.getSubscriptionRemaining() > 0) {
                        int removed = balance.getSubscriptionRemaining();
                        balance.setSubscriptionRemaining(0);
                        balanceRepository.save(balance);
                        appendLedger(sub.getBrandId(), QuotaLedgerEntryType.EXPIRE_RESET, -removed,
                                balance.totalRemaining(), "SUBSCRIPTION", sub.getId(),
                                "Hết hạn gói tháng");
                    }
                    refreshBrandProductEligibility(sub.getBrandId());
                });
    }

    @Transactional
    public void refreshBrandProductEligibility(UUID brandId) {
        boolean quotaOk = hasTryOnQuota(brandId);
        for (Product product : productRepository.findByBrandId(brandId)) {
            boolean metadataOk = eligibilityService.meetsProductMetadataForTryOn(product);
            boolean eligible = metadataOk && quotaOk;
            if (product.isAiTryOnEligible() != eligible) {
                product.setAiTryOnEligible(eligible);
                productRepository.save(product);
            }
        }
    }

    private void appendLedger(UUID brandId, QuotaLedgerEntryType type, int delta, int balanceAfter,
                              String referenceType, UUID referenceId, String note) {
        ledgerRepository.save(BrandQuotaLedger.builder()
                .brandId(brandId)
                .entryType(type)
                .delta(delta)
                .balanceAfter(balanceAfter)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .note(note)
                .build());
    }
}
