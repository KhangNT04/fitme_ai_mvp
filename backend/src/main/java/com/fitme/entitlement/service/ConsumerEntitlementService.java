package com.fitme.entitlement.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.billing.entity.BillingPlan;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.OutfitCoherenceMode;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.common.exception.PremiumRequiredException;
import com.fitme.common.security.RequestContext;
import com.fitme.entitlement.dto.ConsumerEntitlementResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Consumer Free/Premium entitlement. The plan is derived from an active consumer subscription;
 * {@code user_accounts.consumer_plan} is kept in sync by {@link ConsumerSubscriptionService}.
 */
@Service
@RequiredArgsConstructor
public class ConsumerEntitlementService {

    public static final String PREMIUM_LABEL = "FitMe Premium";
    public static final String FREE_LABEL = "FitMe Free";
    public static final String WARDROBE_PREMIUM_MESSAGE = "Tủ đồ là tính năng của FitMe Premium";

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

    /** Free vs Premium personalization depth for preference weights in scoring / stylist. */
    public double resolvePreferenceScaleForCurrentUser() {
        if (!properties.getConsumer().isEntitlementEnabled()) {
            return properties.getConsumer().getPremiumPreferenceScale();
        }
        ConsumerPlan plan = resolvePlan(RequestContext.getCurrentUserId().orElse(null));
        return plan == ConsumerPlan.PREMIUM
                ? properties.getConsumer().getPremiumPreferenceScale()
                : properties.getConsumer().getFreePreferenceScale();
    }

    public ConsumerPlan resolvePlan(UUID userId) {
        if (userId == null) {
            return ConsumerPlan.FREE;
        }
        return subscriptionService.resolvePlan(userId);
    }

    /** Premium-only features are open to everyone when entitlements are switched off. */
    public boolean isPremium(UUID userId) {
        if (!properties.getConsumer().isEntitlementEnabled()) {
            return true;
        }
        return resolvePlan(userId) == ConsumerPlan.PREMIUM;
    }

    public boolean isCurrentUserPremium() {
        return isPremium(RequestContext.getCurrentUserId().orElse(null));
    }

    public void requirePremium(String message) {
        if (!isCurrentUserPremium()) {
            throw new PremiumRequiredException(message);
        }
    }

    /** Free users asking for their wardrobe silently get brand-only outfits; their wardrobe data is kept. */
    public WardrobeMode effectiveWardrobeMode(WardrobeMode requested, UUID userId) {
        WardrobeMode mode = requested != null ? requested : WardrobeMode.NO_WARDROBE_DATA;
        if (usesWardrobe(mode) && !isPremium(userId)) {
            return WardrobeMode.NO_WARDROBE_DATA;
        }
        return mode;
    }

    public WardrobeMode effectiveWardrobeModeForCurrentUser(WardrobeMode requested) {
        return effectiveWardrobeMode(requested, RequestContext.getCurrentUserId().orElse(null));
    }

    public static boolean usesWardrobe(WardrobeMode mode) {
        return mode == WardrobeMode.USE_WARDROBE_FIRST || mode == WardrobeMode.MIX_WARDROBE_AND_BRAND;
    }

    public OutfitCoherenceMode resolveCoherenceMode(ConsumerPlan plan) {
        return resolveCoherenceMode(plan, null);
    }

    public OutfitCoherenceMode resolveCoherenceModeForUser(UUID userId) {
        ConsumerPlan plan = resolvePlan(userId);
        OutfitCoherenceMode override = null;
        if (userId != null && plan == ConsumerPlan.PREMIUM) {
            override = userAccountRepository.findById(userId)
                    .map(UserAccount::getCoherenceModeOverride)
                    .orElse(null);
        }
        return resolveCoherenceMode(plan, override);
    }

    public OutfitCoherenceMode resolveCoherenceMode(ConsumerPlan plan, OutfitCoherenceMode override) {
        if (!properties.getConsumer().isEntitlementEnabled()) {
            return parseMode(properties.getConsumer().getPremiumCoherenceMode(), OutfitCoherenceMode.PREFER);
        }
        if (plan != ConsumerPlan.PREMIUM) {
            return parseMode(properties.getConsumer().getFreeCoherenceMode(), OutfitCoherenceMode.OFF);
        }
        if (override == OutfitCoherenceMode.STRICT || override == OutfitCoherenceMode.PREFER) {
            return override;
        }
        return parseMode(properties.getConsumer().getPremiumCoherenceMode(), OutfitCoherenceMode.PREFER);
    }

    @Transactional
    public ConsumerEntitlementResponse setPlan(UUID userId, ConsumerPlan plan) {
        return setPlan(userId, plan, null);
    }

    /** Admin-only manual grant/revoke: PREMIUM creates a 30-day subscription without payment. */
    @Transactional
    public ConsumerEntitlementResponse setPlan(UUID userId, ConsumerPlan plan, OutfitCoherenceMode coherenceMode) {
        if (plan == ConsumerPlan.PREMIUM) {
            subscriptionService.adminGrantPremium(userId, coherenceMode);
        } else {
            subscriptionService.adminRevokePremium(userId);
        }
        return toResponse(resolvePlan(userId), resolveCoherenceModeForUser(userId));
    }

    private ConsumerEntitlementResponse toResponse(ConsumerPlan plan, OutfitCoherenceMode mode) {
        boolean premium = plan == ConsumerPlan.PREMIUM;
        String mixPolicy = !premium
                ? "Được phối lẫn nhiều brand để khám phá"
                : mode == OutfitCoherenceMode.STRICT
                ? "STRICT: chỉ ưu tiên mạnh cùng brand / partner (soft-filter)"
                : "Ưu tiên outfit cùng brand / brand đối tác";
        Optional<BillingPlan> premiumPlan = subscriptionService.findPremiumPlan();
        return ConsumerEntitlementResponse.builder()
                .plan(plan)
                .coherenceMode(mode)
                .premium(premium)
                .pro(premium)
                .label(premium ? PREMIUM_LABEL : FREE_LABEL)
                .mixPolicy(mixPolicy)
                .upsellMessage(premium ? null : upsellMessage(premiumPlan.orElse(null)))
                .premiumPriceVnd(premiumPlan.map(BillingPlan::getPriceVnd).orElse(null))
                .premiumMonthlyFitken(premiumPlan.map(BillingPlan::getQuotaAmount).orElse(null))
                .build();
    }

    static String upsellMessage(BillingPlan plan) {
        StringBuilder message = new StringBuilder("Nâng cấp ").append(PREMIUM_LABEL);
        if (plan != null && plan.getPriceVnd() > 0) {
            message.append(' ').append(formatVnd(plan.getPriceVnd())).append("/tháng");
        }
        message.append(": tùy biến phối đồ theo brand yêu thích, tủ đồ và phối kèm đồ có sẵn");
        if (plan != null && plan.getQuotaAmount() > 0) {
            message.append(", ").append(plan.getQuotaAmount()).append(" Fitken mỗi tháng");
        } else {
            message.append(", Fitken hàng tháng");
        }
        return message.append('.').toString();
    }

    static String formatVnd(long amount) {
        return String.format(Locale.ROOT, "%,d", amount).replace(',', '.') + "đ";
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
