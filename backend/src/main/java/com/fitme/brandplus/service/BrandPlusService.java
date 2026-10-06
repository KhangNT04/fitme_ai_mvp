package com.fitme.brandplus.service;

import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.payos.PayOsClient;
import com.fitme.billing.payos.PayOsOrderCodeGenerator;
import com.fitme.billing.payos.PayOsPaymentLink;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.service.PlanPricing;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.brandplus.dto.AdminBrandSubscriptionDto;
import com.fitme.brandplus.dto.BrandBillingOrderDto;
import com.fitme.brandplus.dto.BrandPlusCheckoutResponse;
import com.fitme.brandplus.dto.BrandPlusStatusDto;
import com.fitme.brandplus.entity.BrandBillingOrder;
import com.fitme.brandplus.entity.BrandSubscription;
import com.fitme.brandplus.repository.BrandBillingOrderRepository;
import com.fitme.brandplus.repository.BrandSubscriptionRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.BillingOrderStatus;
import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.enums.BrandSubscriptionStatus;
import com.fitme.common.enums.PlanAudience;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** FitMe Brand Plus: the single paid plan for brands, bought through PayOS and renewed by stacking periods. */
@Service
@RequiredArgsConstructor
@Slf4j
public class BrandPlusService {

    public static final String PLAN_CODE = "BRAND_PLUS";
    private static final int DEFAULT_PERIOD_DAYS = 30;
    private static final String PAYMENT_DESCRIPTION = "FitMe Brand Plus";

    private final BillingPlanRepository planRepository;
    private final BrandBillingOrderRepository orderRepository;
    private final BrandSubscriptionRepository subscriptionRepository;
    private final BrandRepository brandRepository;
    private final PayOsClient payOsClient;
    private final PayOsOrderCodeGenerator orderCodes;
    private final FitMeProperties properties;
    private final AppClock clock;

    /** The plan sold as Brand Plus (admin-editable price / discount), falling back to the first active BRAND plan. */
    public Optional<BillingPlan> findPlan() {
        return planRepository.findByCode(PLAN_CODE)
                .filter(plan -> plan.getAudience() == PlanAudience.BRAND)
                .or(() -> planRepository.findFirstByPlanTypeAndAudienceAndActiveTrueOrderBySortOrderAsc(
                        BillingPlanType.SUBSCRIPTION, PlanAudience.BRAND));
    }

    public boolean isPlusActive(UUID brandId) {
        if (brandId == null) {
            return false;
        }
        return subscriptionRepository.existsByBrandIdAndStatusAndEndsAtAfter(
                brandId, BrandSubscriptionStatus.ACTIVE, clock.now());
    }

    /** Brands with Brand Plus right now, in a single query (for ranking / lead features). */
    public Set<UUID> activePlusBrandIds() {
        return subscriptionRepository.findBrandIdsByStatusAndEndsAtAfter(BrandSubscriptionStatus.ACTIVE, clock.now());
    }

    /** Every brand's subscription row keyed by brand id (admin brand list). */
    public Map<UUID, BrandSubscription> subscriptionsByBrand() {
        return subscriptionRepository.findAll().stream()
                .collect(Collectors.toMap(BrandSubscription::getBrandId, Function.identity()));
    }

    public BrandPlusStatusDto status(UUID brandId) {
        Instant now = clock.now();
        Optional<BrandSubscription> subscription = subscriptionRepository.findByBrandId(brandId);
        Optional<BillingPlan> plan = findPlan();
        BrandPlusStatusDto.BrandPlusStatusDtoBuilder builder = BrandPlusStatusDto.builder()
                .active(subscription.map(sub -> sub.isActiveAt(now)).orElse(false))
                .status(subscription.map(sub -> effectiveStatus(sub, now)).orElse(null))
                .startsAt(subscription.map(BrandSubscription::getStartsAt).orElse(null))
                .endsAt(subscription.map(BrandSubscription::getEndsAt).orElse(null))
                .pendingOrder(orderRepository
                        .findFirstByBrandIdAndStatusOrderByCreatedAtDesc(brandId, BillingOrderStatus.PENDING)
                        .map(this::toDto)
                        .orElse(null));
        plan.ifPresent(p -> {
            boolean discountActive = PlanPricing.isDiscountActive(p, now);
            builder.planAvailable(p.isActive())
                    .planId(p.getId())
                    .planCode(p.getCode())
                    .planName(p.getName())
                    .billingPeriodDays(periodDays(p))
                    .listPriceVnd(p.getPriceVnd())
                    .effectivePriceVnd(PlanPricing.effectivePrice(p, now))
                    .discountActive(discountActive);
            if (discountActive) {
                builder.discountPercent(p.getDiscountPercent())
                        .discountStartsAt(p.getDiscountStartsAt())
                        .discountEndsAt(p.getDiscountEndsAt());
            }
        });
        return builder.build();
    }

    /**
     * Creates a PENDING order at the current effective price and a PayOS payment link for it.
     * With mock PayOS the link is the FitMe return page; the order is confirmed when that page polls
     * {@link #getOrder}. With live PayOS the webhook is the source of truth.
     */
    @Transactional
    public BrandPlusCheckoutResponse checkout(UUID brandId, UUID userId) {
        BillingPlan plan = findPlan()
                .filter(BillingPlan::isActive)
                .orElseThrow(() -> new BusinessException("Gói Brand Plus hiện chưa mở bán", "BRAND_PLUS_UNAVAILABLE"));
        Instant now = clock.now();
        int discountPercent = PlanPricing.appliedDiscountPercent(plan, now);
        long amount = PlanPricing.discounted(plan.getPriceVnd(), discountPercent);
        if (amount <= 0) {
            throw new BusinessException("Giá gói sau giảm phải lớn hơn 0đ. Vui lòng liên hệ FitMe để được kích hoạt.");
        }

        long orderCode = orderCodes.next();
        BrandBillingOrder order = orderRepository.save(BrandBillingOrder.builder()
                .brandId(brandId)
                .planId(plan.getId())
                .orderCode(orderCode)
                .listPrice(plan.getPriceVnd())
                .discountPercentApplied(discountPercent)
                .amount(amount)
                .status(BillingOrderStatus.PENDING)
                .createdByUserId(userId)
                .build());

        PayOsPaymentLink link = payOsClient.createPaymentLink(orderCode, amount, PAYMENT_DESCRIPTION,
                returnUrl(), cancelUrl());
        order.setPayosPaymentLinkId(link.paymentLinkId());
        order.setCheckoutUrl(link.checkoutUrl());
        orderRepository.save(order);

        return BrandPlusCheckoutResponse.builder()
                .orderId(order.getId())
                .orderCode(orderCode)
                .listPriceVnd(order.getListPrice())
                .discountPercentApplied(discountPercent)
                .amountVnd(amount)
                .checkoutUrl(link.checkoutUrl())
                .mock(properties.getPayos().isMock())
                .build();
    }

    /** Return-page polling. Only the owning brand sees the order; mock PayOS completes a pending order here. */
    @Transactional
    public BrandBillingOrderDto getOrder(UUID brandId, long orderCode) {
        BrandBillingOrder order = requireOwnOrder(brandId, orderCode);
        if (properties.getPayos().isMock() && order.getStatus() == BillingOrderStatus.PENDING) {
            markPaid(order);
        }
        return toDto(order);
    }

    /** The brand came back through the PayOS cancel URL. A late successful webhook still marks the order paid. */
    @Transactional
    public BrandBillingOrderDto cancelOrder(UUID brandId, long orderCode) {
        BrandBillingOrder order = requireOwnOrder(brandId, orderCode);
        if (order.getStatus() == BillingOrderStatus.PENDING) {
            order.setStatus(BillingOrderStatus.CANCELLED);
            orderRepository.save(order);
        }
        return toDto(order);
    }

    /** Idempotent: a PAID order is never applied twice. */
    @Transactional
    public void markPaid(long orderCode) {
        markPaid(orderRepository.findByOrderCodeForUpdate(orderCode)
                .orElseThrow(() -> new NotFoundException("Đơn thanh toán không tồn tại")));
    }

    /** @return true when the order code belongs to a Brand Plus order. */
    @Transactional
    public boolean handlePaid(long orderCode, Long amountVnd) {
        Optional<BrandBillingOrder> order = orderRepository.findByOrderCodeForUpdate(orderCode);
        if (order.isEmpty()) {
            return false;
        }
        if (amountVnd != null && amountVnd < order.get().getAmount()) {
            log.warn("PayOS amount {} VND below {} VND for Brand Plus order {} - left unpaid",
                    amountVnd, order.get().getAmount(), order.get().getId());
            return true;
        }
        markPaid(order.get());
        return true;
    }

    /** @return true when the order code belongs to a Brand Plus order. */
    @Transactional
    public boolean handleUnpaid(long orderCode) {
        Optional<BrandBillingOrder> order = orderRepository.findByOrderCodeForUpdate(orderCode);
        if (order.isEmpty()) {
            return false;
        }
        if (order.get().getStatus() == BillingOrderStatus.PENDING) {
            order.get().setStatus(BillingOrderStatus.FAILED);
            orderRepository.save(order.get());
        }
        return true;
    }

    @Scheduled(cron = "0 10 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public int expireDue() {
        int expired = subscriptionRepository.expireEndedBefore(clock.now(),
                BrandSubscriptionStatus.ACTIVE, BrandSubscriptionStatus.EXPIRED);
        if (expired > 0) {
            log.info("Expired {} Brand Plus subscriptions", expired);
        }
        return expired;
    }

    public List<AdminBrandSubscriptionDto> adminList() {
        Instant now = clock.now();
        List<BrandSubscription> subscriptions = subscriptionRepository.findAllByOrderByEndsAtDesc();
        Map<UUID, String> brandNames = brandRepository
                .findAllById(subscriptions.stream().map(BrandSubscription::getBrandId).toList()).stream()
                .collect(Collectors.toMap(Brand::getId, Brand::getName));
        return subscriptions.stream()
                .map(sub -> AdminBrandSubscriptionDto.builder()
                        .brandId(sub.getBrandId())
                        .brandName(brandNames.get(sub.getBrandId()))
                        .status(effectiveStatus(sub, now))
                        .active(sub.isActiveAt(now))
                        .startsAt(sub.getStartsAt())
                        .endsAt(sub.getEndsAt())
                        .build())
                .toList();
    }

    private void markPaid(BrandBillingOrder order) {
        if (order.getStatus() == BillingOrderStatus.PAID) {
            return;
        }
        BillingPlan plan = planRepository.findById(order.getPlanId())
                .orElseThrow(() -> new NotFoundException("Gói không tồn tại"));
        Instant now = clock.now();
        order.setStatus(BillingOrderStatus.PAID);
        order.setPaidAt(now);
        orderRepository.save(order);

        BrandSubscription subscription = subscriptionRepository.findByBrandIdForUpdate(order.getBrandId())
                .orElseGet(() -> BrandSubscription.builder().brandId(order.getBrandId()).build());
        boolean stillActive = subscription.getId() != null && subscription.isActiveAt(now);
        Instant base = stillActive ? subscription.getEndsAt() : now;
        if (!stillActive) {
            subscription.setStartsAt(now);
        }
        subscription.setPlanId(plan.getId());
        subscription.setStatus(BrandSubscriptionStatus.ACTIVE);
        subscription.setEndsAt(base.plus(periodDays(plan), ChronoUnit.DAYS));
        subscription.setLastOrderId(order.getId());
        subscriptionRepository.save(subscription);
        log.info("Brand Plus order {} paid: brand {} active until {}", order.getOrderCode(), order.getBrandId(),
                subscription.getEndsAt());
    }

    private BrandBillingOrder requireOwnOrder(UUID brandId, long orderCode) {
        return orderRepository.findByOrderCodeForUpdate(orderCode)
                .filter(order -> order.getBrandId().equals(brandId))
                .orElseThrow(() -> new NotFoundException("Đơn thanh toán không tồn tại"));
    }

    private BrandBillingOrderDto toDto(BrandBillingOrder order) {
        BillingPlan plan = planRepository.findById(order.getPlanId()).orElse(null);
        Instant plusEndsAt = order.getStatus() == BillingOrderStatus.PAID
                ? subscriptionRepository.findByBrandId(order.getBrandId()).map(BrandSubscription::getEndsAt).orElse(null)
                : null;
        return toDto(order, plan, plusEndsAt);
    }

    private static BrandBillingOrderDto toDto(BrandBillingOrder order, BillingPlan plan, Instant plusEndsAt) {
        return BrandBillingOrderDto.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .planName(plan != null ? plan.getName() : null)
                .listPriceVnd(order.getListPrice())
                .discountPercentApplied(order.getDiscountPercentApplied())
                .amountVnd(order.getAmount())
                .status(order.getStatus())
                .checkoutUrl(order.getCheckoutUrl())
                .createdAt(order.getCreatedAt())
                .paidAt(order.getPaidAt())
                .plusEndsAt(plusEndsAt)
                .build();
    }

    private static BrandSubscriptionStatus effectiveStatus(BrandSubscription sub, Instant now) {
        return sub.getStatus() == BrandSubscriptionStatus.ACTIVE && !sub.isActiveAt(now)
                ? BrandSubscriptionStatus.EXPIRED
                : sub.getStatus();
    }

    private static int periodDays(BillingPlan plan) {
        return plan.getBillingPeriodDays() != null && plan.getBillingPeriodDays() > 0
                ? plan.getBillingPeriodDays()
                : DEFAULT_PERIOD_DAYS;
    }

    private String returnUrl() {
        return brandReturnUrl(properties.getPayos().getBrandPlusReturnUrl(), "success");
    }

    private String cancelUrl() {
        return brandReturnUrl(properties.getPayos().getBrandPlusCancelUrl(), "cancel");
    }

    private String brandReturnUrl(String configured, String status) {
        if (configured != null && !configured.isBlank()) {
            return configured;
        }
        URI base = URI.create(properties.getPayos().getSubscriptionReturnUrl());
        return base.getScheme() + "://" + base.getRawAuthority() + "/brand/plan/return?status=" + status;
    }
}
