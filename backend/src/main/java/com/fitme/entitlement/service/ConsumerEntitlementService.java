package com.fitme.entitlement.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.security.RequestContext;
import com.fitme.entitlement.dto.ConsumerEntitlementResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

/**
 * Consumer Free/Pro entitlement. The plan is derived from an active consumer subscription;
 * {@code user_accounts.consumer_plan} is kept in sync by {@link ConsumerSubscriptionService}.
 */
@Service
@RequiredArgsConstructor
public class ConsumerEntitlementService {

    private final UserAccountRepository userAccountRepository;
    private final ConsumerSubscriptionService subscriptionService;
    private final FitMeProperties properties;

    public ConsumerEntitlementResponse resolveCurrent() {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        return toResponse(resolvePlan(userId), resolveCoherenceModeForUser(userId));
    }

    public OutfitCoherenceMode resolveCoherenceModeForCurrentUser() {
        return resolveCoherenceModeForUser(RequestContext.getCurrentUserId().orElse(null));
    }

    /** Free vs Pro personalization depth for preference weights in scoring / stylist. */
    public double resolvePreferenceScaleForCurrentUser() {
        if (!properties.getConsumer().isEntitlementEnabled()) {
            return properties.getConsumer().getPlusPreferenceScale();
        }
        ConsumerPlan plan = resolvePlan(RequestContext.getCurrentUserId().orElse(null));
        return plan == ConsumerPlan.PRO
                ? properties.getConsumer().getPlusPreferenceScale()
                : properties.getConsumer().getFreePreferenceScale();
    }

    public ConsumerPlan resolvePlan(UUID userId) {
        if (userId == null) {
            return ConsumerPlan.FREE;
        }
        return subscriptionService.resolvePlan(userId);
    }

    public OutfitCoherenceMode resolveCoherenceMode(ConsumerPlan plan) {
        return resolveCoherenceMode(plan, null);
    }

    public OutfitCoherenceMode resolveCoherenceModeForUser(UUID userId) {
        ConsumerPlan plan = resolvePlan(userId);
        OutfitCoherenceMode override = null;
        if (userId != null && plan == ConsumerPlan.PRO) {
            override = userAccountRepository.findById(userId)
                    .map(UserAccount::getCoherenceModeOverride)
                    .orElse(null);
        }
        return resolveCoherenceMode(plan, override);
    }

    public OutfitCoherenceMode resolveCoherenceMode(ConsumerPlan plan, OutfitCoherenceMode override) {
        if (!properties.getConsumer().isEntitlementEnabled()) {
            return parseMode(properties.getConsumer().getPlusCoherenceMode(), OutfitCoherenceMode.PREFER);
        }
        if (plan != ConsumerPlan.PRO) {
            return parseMode(properties.getConsumer().getFreeCoherenceMode(), OutfitCoherenceMode.OFF);
        }
        if (override == OutfitCoherenceMode.STRICT || override == OutfitCoherenceMode.PREFER) {
            return override;
        }
        return parseMode(properties.getConsumer().getPlusCoherenceMode(), OutfitCoherenceMode.PREFER);
    }

    @Transactional
    public ConsumerEntitlementResponse setPlan(UUID userId, ConsumerPlan plan) {
        return setPlan(userId, plan, null);
    }

    /** Admin-only manual grant/revoke: PRO creates a 30-day subscription without payment. */
    @Transactional
    public ConsumerEntitlementResponse setPlan(UUID userId, ConsumerPlan plan, OutfitCoherenceMode coherenceMode) {
        if (plan == ConsumerPlan.PRO) {
            subscriptionService.adminGrantPro(userId, coherenceMode);
        } else {
            subscriptionService.adminRevokePro(userId);
        }
        return toResponse(resolvePlan(userId), resolveCoherenceModeForUser(userId));
    }

    private ConsumerEntitlementResponse toResponse(ConsumerPlan plan, OutfitCoherenceMode mode) {
        boolean pro = plan == ConsumerPlan.PRO;
        String mixPolicy = !pro
                ? "Được phối lẫn nhiều brand để khám phá"
                : mode == OutfitCoherenceMode.STRICT
                ? "STRICT: chỉ ưu tiên mạnh cùng brand / partner (soft-filter)"
                : "Ưu tiên outfit cùng brand / brand đối tác";
        return ConsumerEntitlementResponse.builder()
                .plan(plan)
                .coherenceMode(mode)
                .pro(pro)
                .plus(pro)
                .label(pro ? "FitMe Pro" : "FitMe Free")
                .mixPolicy(mixPolicy)
                .upsellMessage(pro
                        ? null
                        : "Nâng cấp FitMe Pro 49.000đ/tháng: 15 Fitken thử đồ AI mỗi tháng và cá nhân hóa sâu hơn.")
                .build();
    }

    private static OutfitCoherenceMode parseMode(String raw, OutfitCoherenceMode fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return OutfitCoherenceMode.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return fallback;
        }
    }
}
