package com.fitme.billing.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.billing.dto.CheckoutResponse;
import com.fitme.billing.dto.ConsumerBillingOrderDto;
import com.fitme.billing.dto.SubscriptionInfoDto;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.entity.ConsumerBillingOrder;
import com.fitme.billing.entity.ConsumerSubscription;
import com.fitme.billing.payos.PayOsClient;
import com.fitme.billing.payos.PayOsPaymentLink;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.repository.ConsumerBillingOrderRepository;
import com.fitme.billing.repository.ConsumerSubscriptionRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.BillingOrderStatus;
import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.ConsumerSubscriptionStatus;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import com.fitme.fitken.service.FitkenService;
import com.fitme.notification.PlanPurchasedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConsumerSubscriptionService {

    public static final String PRO_PLAN_CODE = "PRO_MONTHLY";
    private static final int DEFAULT_PERIOD_DAYS = 30;
    private static final String REF_ADMIN_GRANT = "ADMIN_GRANT";

    private final BillingPlanRepository planRepository;
    private final ConsumerBillingOrderRepository orderRepository;
    private final ConsumerSubscriptionRepository subscriptionRepository;
    private final UserAccountRepository userAccountRepository;
    private final FitkenService fitkenService;
    private final PayOsClient payOsClient;
    private final FitMeProperties properties;
    private final BillingDtoMapper dtoMapper;
    private final AppClock clock;
    private final ApplicationEventPublisher events;

    public Optional<ConsumerSubscription> findActive(UUID userId) {
        if (userId == null) {
            return Optional.empty();
        }
        Instant now = clock.now();
        return subscriptionRepository.findByUserId(userId).filter(sub -> sub.isActiveAt(now));
    }

    public ConsumerPlan resolvePlan(UUID userId) {
        return findActive(userId).isPresent() ? ConsumerPlan.PRO : ConsumerPlan.FREE;
    }

    public SubscriptionInfoDto describe(UUID userId) {
        return subscriptionRepository.findByUserId(userId)
                .map(sub -> SubscriptionInfoDto.builder()
                        .planId(sub.getPlanId())
                        .planName(planRepository.findById(sub.getPlanId()).map(BillingPlan::getName).orElse(null))
                        .status(sub.getStatus() == ConsumerSubscriptionStatus.ACTIVE && !sub.isActiveAt(clock.now())
                                ? ConsumerSubscriptionStatus.EXPIRED
                                : sub.getStatus())
                        .startsAt(sub.getStartsAt())
                        .expiresAt(sub.getExpiresAt())
                        .build())
                .orElse(null);
    }

    @Transactional
    public CheckoutResponse checkout(UUID userId, UUID planId) {
        BillingPlan plan = planRepository.findById(planId)
                .orElseThrow(() -> new NotFoundException("Gói không tồn tại"));
        if (!plan.isActive()) {
            throw new BusinessException("Gói không còn khả dụng");
        }

        long orderCode = nextOrderCode();
        ConsumerBillingOrder order = orderRepository.save(ConsumerBillingOrder.builder()
                .userId(userId)
                .planId(plan.getId())
                .amountVnd(plan.getPriceVnd())
                .status(BillingOrderStatus.PENDING)
                .payosOrderCode(orderCode)
                .build());

        PayOsPaymentLink link = payOsClient.createPaymentLink(orderCode, plan.getPriceVnd(),
                "FitMe " + plan.getName(),
                properties.getPayos().getSubscriptionReturnUrl(),
                properties.getPayos().getSubscriptionCancelUrl());
        order.setPayosPaymentLinkId(link.paymentLinkId());
        order.setCheckoutUrl(link.checkoutUrl());
        orderRepository.save(order);

        boolean mockPaid = properties.getPayos().isMock();
        if (mockPaid) {
            markPaid(order);
        }
        return CheckoutResponse.builder()
                .orderId(order.getId())
                .payosOrderCode(orderCode)
                .checkoutUrl(link.checkoutUrl())
                .mockPaid(mockPaid)
                .build();
    }

    /**
     * Called by the frontend return page. With mock PayOS the order is completed here;
     * with live PayOS the webhook is the source of truth and this only reports status.
     */
    @Transactional
    public ConsumerBillingOrderDto confirmReturn(UUID userId, long orderCode) {
        ConsumerBillingOrder order = orderRepository.findByPayosOrderCodeForUpdate(orderCode)
                .orElseThrow(() -> new NotFoundException("Đơn thanh toán không tồn tại"));
        if (!order.getUserId().equals(userId)) {
            throw new NotFoundException("Đơn thanh toán không tồn tại");
        }
        if (properties.getPayos().isMock() && order.getStatus() == BillingOrderStatus.PENDING) {
            markPaid(order);
        }
        return dtoMapper.toDto(order, planRepository.findById(order.getPlanId()).orElse(null));
    }

    public List<ConsumerBillingOrderDto> recentOrders(UUID userId) {
        return orderRepository.findTop10ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(order -> dtoMapper.toDto(order, planRepository.findById(order.getPlanId()).orElse(null)))
                .toList();
    }

    /** @return true when the order code belongs to a consumer subscription order. */
    @Transactional
    public boolean handlePaid(long orderCode, Long amountVnd) {
        Optional<ConsumerBillingOrder> order = orderRepository.findByPayosOrderCodeForUpdate(orderCode);
        if (order.isEmpty()) {
            return false;
        }
        if (amountVnd != null && amountVnd < order.get().getAmountVnd()) {
            log.warn("PayOS amount {} VND below {} VND for billing order {} - left unpaid",
                    amountVnd, order.get().getAmountVnd(), order.get().getId());
            return true;
        }
        markPaid(order.get());
        return true;
    }

    private void markPaid(ConsumerBillingOrder order) {
        if (order.getStatus() == BillingOrderStatus.PAID) {
            return;
        }
        BillingPlan plan = planRepository.findById(order.getPlanId())
                .orElseThrow(() -> new NotFoundException("Gói không tồn tại"));
        Instant now = clock.now();
        order.setStatus(BillingOrderStatus.PAID);
        order.setPaidAt(now);
        orderRepository.save(order);
        events.publishEvent(new PlanPurchasedEvent(order.getId()));

        if (plan.getPlanType() == BillingPlanType.TOPUP) {
            fitkenService.grant(order.getUserId(), FitkenEntryType.TOPUP_GRANT, plan.getQuotaAmount(),
                    FitkenService.Bucket.BONUS, FitkenService.REF_BILLING_ORDER, order.getId(),
                    "Mua " + plan.getName());
            return;
        }
        activateSubscription(order.getUserId(), plan, order.getId(), FitkenService.REF_BILLING_ORDER,
                order.getId(), "Gói " + plan.getName());
    }

    private ConsumerSubscription activateSubscription(UUID userId, BillingPlan plan, UUID lastOrderId,
                                                      String grantReferenceType, UUID grantReferenceId,
                                                      String note) {
        Instant now = clock.now();
        int days = plan.getBillingPeriodDays() != null && plan.getBillingPeriodDays() > 0
                ? plan.getBillingPeriodDays()
                : DEFAULT_PERIOD_DAYS;
        ConsumerSubscription subscription = subscriptionRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> ConsumerSubscription.builder().userId(userId).build());
        boolean stillActive = subscription.getId() != null && subscription.isActiveAt(now);
        Instant base = stillActive ? subscription.getExpiresAt() : now;
        if (!stillActive) {
            subscription.setStartsAt(now);
        }
        subscription.setPlanId(plan.getId());
        subscription.setStatus(ConsumerSubscriptionStatus.ACTIVE);
        subscription.setExpiresAt(base.plus(days, ChronoUnit.DAYS));
        if (lastOrderId != null) {
            subscription.setLastOrderId(lastOrderId);
        }
        subscription = subscriptionRepository.save(subscription);

        fitkenService.grant(userId, FitkenEntryType.SUBSCRIPTION_GRANT, plan.getQuotaAmount(),
                FitkenService.Bucket.SUBSCRIPTION, grantReferenceType, grantReferenceId, note);
        syncUserPlan(userId, ConsumerPlan.PRO, null);
        return subscription;
    }

    /**
     * Admin manual grant: a paid-equivalent Pro period (Fitken) without PayOS.
     * Users who already have an active Pro period only get their coherence preference updated.
     */
    @Transactional
    public void adminGrantPro(UUID userId, OutfitCoherenceMode coherenceMode) {
        requireUser(userId);
        if (findActive(userId).isEmpty()) {
            BillingPlan plan = planRepository.findByCode(PRO_PLAN_CODE)
                    .or(() -> planRepository.findFirstByPlanTypeAndActiveTrueOrderBySortOrderAsc(
                            BillingPlanType.SUBSCRIPTION))
                    .orElseThrow(() -> new NotFoundException("Chưa cấu hình gói FitMe Pro"));
            activateSubscription(userId, plan, null, REF_ADMIN_GRANT, UUID.randomUUID(),
                    "Admin kích hoạt " + plan.getName());
        }
        syncUserPlan(userId, ConsumerPlan.PRO, coherenceMode);
    }

    @Transactional
    public void adminRevokePro(UUID userId) {
        requireUser(userId);
        subscriptionRepository.findByUserIdForUpdate(userId).ifPresent(sub -> {
            if (sub.getStatus() == ConsumerSubscriptionStatus.ACTIVE) {
                sub.setStatus(ConsumerSubscriptionStatus.CANCELLED);
                subscriptionRepository.save(sub);
                fitkenService.resetSubscriptionBucket(userId, sub.getId(), "Admin hủy gói FitMe Pro");
            }
        });
        syncUserPlan(userId, ConsumerPlan.FREE, null);
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public int expireSubscriptions() {
        List<ConsumerSubscription> expired = subscriptionRepository.findByStatusAndExpiresAtBefore(
                ConsumerSubscriptionStatus.ACTIVE, clock.now());
        for (ConsumerSubscription sub : expired) {
            sub.setStatus(ConsumerSubscriptionStatus.EXPIRED);
            subscriptionRepository.save(sub);
            fitkenService.resetSubscriptionBucket(sub.getUserId(), sub.getId(), "Hết hạn gói FitMe Pro");
            syncUserPlan(sub.getUserId(), ConsumerPlan.FREE, null);
        }
        if (!expired.isEmpty()) {
            log.info("Expired {} consumer subscriptions", expired.size());
        }
        return expired.size();
    }

    private void syncUserPlan(UUID userId, ConsumerPlan plan, OutfitCoherenceMode coherenceMode) {
        userAccountRepository.findById(userId).ifPresent(user -> {
            user.setConsumerPlan(plan);
            if (plan == ConsumerPlan.FREE) {
                user.setCoherenceModeOverride(null);
            } else if (coherenceMode == OutfitCoherenceMode.STRICT || coherenceMode == OutfitCoherenceMode.PREFER) {
                user.setCoherenceModeOverride(coherenceMode);
            } else if (user.getCoherenceModeOverride() == null) {
                user.setCoherenceModeOverride(OutfitCoherenceMode.PREFER);
            }
            userAccountRepository.save(user);
        });
    }

    private UserAccount requireUser(UUID userId) {
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User không tồn tại"));
    }

    private long nextOrderCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            long code = System.currentTimeMillis() % 9_000_000_000L * 10L + ThreadLocalRandom.current().nextInt(10);
            if (!orderRepository.existsByPayosOrderCode(code)) {
                return code;
            }
        }
        throw new BusinessException("Không tạo được mã thanh toán, vui lòng thử lại");
    }
}
