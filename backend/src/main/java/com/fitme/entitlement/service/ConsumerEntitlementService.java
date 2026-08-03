package com.fitme.entitlement.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.entitlement.dto.ConsumerEntitlementResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConsumerEntitlementService {

    private final UserAccountRepository userAccountRepository;
    private final FitMeProperties properties;

    public ConsumerEntitlementResponse resolveCurrent() {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        return toResponse(resolvePlan(userId), resolveCoherenceModeForUser(userId));
    }

    public OutfitCoherenceMode resolveCoherenceModeForCurrentUser() {
        return resolveCoherenceModeForUser(RequestContext.getCurrentUserId().orElse(null));
    }

    /** Free vs Plus personalization depth for preference weights in scoring / stylist. */
    public double resolvePreferenceScaleForCurrentUser() {
        ConsumerPlan plan = resolvePlan(RequestContext.getCurrentUserId().orElse(null));
        if (!properties.getConsumer().isEntitlementEnabled()) {
            return properties.getConsumer().getPlusPreferenceScale();
        }
        return plan == ConsumerPlan.PLUS
                ? properties.getConsumer().getPlusPreferenceScale()
                : properties.getConsumer().getFreePreferenceScale();
    }

    public ConsumerPlan resolvePlan(UUID userId) {
        if (userId == null) {
            return ConsumerPlan.FREE;
        }
        return userAccountRepository.findById(userId)
                .map(UserAccount::getConsumerPlan)
                .orElse(ConsumerPlan.FREE);
    }

    public OutfitCoherenceMode resolveCoherenceMode(ConsumerPlan plan) {
        return resolveCoherenceMode(plan, null);
    }

    public OutfitCoherenceMode resolveCoherenceModeForUser(UUID userId) {
        ConsumerPlan plan = resolvePlan(userId);
        OutfitCoherenceMode override = null;
        if (userId != null && plan == ConsumerPlan.PLUS) {
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
        if (plan != ConsumerPlan.PLUS) {
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

    @Transactional
    public ConsumerEntitlementResponse setPlan(
            UUID userId,
            ConsumerPlan plan,
            OutfitCoherenceMode coherenceMode) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User không tồn tại"));
        ConsumerPlan nextPlan = plan != null ? plan : ConsumerPlan.FREE;
        user.setConsumerPlan(nextPlan);
        if (nextPlan == ConsumerPlan.FREE) {
            user.setCoherenceModeOverride(null);
        } else if (coherenceMode == OutfitCoherenceMode.STRICT
                || coherenceMode == OutfitCoherenceMode.PREFER) {
            user.setCoherenceModeOverride(coherenceMode);
        } else if (user.getCoherenceModeOverride() == null) {
            user.setCoherenceModeOverride(OutfitCoherenceMode.PREFER);
        }
        userAccountRepository.save(user);
        return toResponse(user.getConsumerPlan(), resolveCoherenceMode(user.getConsumerPlan(), user.getCoherenceModeOverride()));
    }

    private ConsumerEntitlementResponse toResponse(ConsumerPlan plan, OutfitCoherenceMode mode) {
        boolean plus = plan == ConsumerPlan.PLUS;
        String mixPolicy = !plus
                ? "Được phối lẫn nhiều brand để khám phá"
                : mode == OutfitCoherenceMode.STRICT
                ? "STRICT: chỉ ưu tiên mạnh cùng brand / partner (soft-filter)"
                : "Ưu tiên outfit cùng brand / brand đối tác";
        return ConsumerEntitlementResponse.builder()
                .plan(plan)
                .coherenceMode(mode)
                .plus(plus)
                .label(plus ? "FitMe Plus" : "FitMe Free")
                .mixPolicy(mixPolicy)
                .upsellMessage(plus
                        ? null
                        : "Muốn bộ đồ đồng bộ brand + cá nhân hóa sâu hơn? Thử FitMe Plus.")
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
