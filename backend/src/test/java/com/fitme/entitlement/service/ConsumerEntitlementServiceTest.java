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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsumerEntitlementServiceTest {

    @Mock
    private UserAccountRepository userAccountRepository;

    @Mock
    private ConsumerSubscriptionService subscriptionService;

    private FitMeProperties properties;
    private ConsumerEntitlementService service;

    @BeforeEach
    void setUp() {
        properties = new FitMeProperties();
        properties.getConsumer().setFreeCoherenceMode("off");
        properties.getConsumer().setPremiumCoherenceMode("prefer");
        properties.getConsumer().setEntitlementEnabled(true);
        service = new ConsumerEntitlementService(userAccountRepository, subscriptionService, properties);
    }

    @Test
    void anonymousUserIsFreeWithOffCoherence() {
        assertThat(service.resolvePlan(null)).isEqualTo(ConsumerPlan.FREE);
        assertThat(service.resolveCoherenceMode(ConsumerPlan.FREE)).isEqualTo(OutfitCoherenceMode.OFF);
    }

    @Test
    void premiumSubscriberGetsPreferCoherence() {
        UUID id = UUID.randomUUID();
        when(subscriptionService.resolvePlan(id)).thenReturn(ConsumerPlan.PREMIUM);
        assertThat(service.resolvePlan(id)).isEqualTo(ConsumerPlan.PREMIUM);
        assertThat(service.isPremium(id)).isTrue();
        assertThat(service.resolveCoherenceMode(ConsumerPlan.PREMIUM)).isEqualTo(OutfitCoherenceMode.PREFER);
    }

    @Test
    void legacyProAndPlusValuesMapToPremium() {
        assertThat(ConsumerPlan.fromValue("plus")).isEqualTo(ConsumerPlan.PREMIUM);
        assertThat(ConsumerPlan.fromValue("PRO")).isEqualTo(ConsumerPlan.PREMIUM);
        assertThat(ConsumerPlan.fromValue("premium")).isEqualTo(ConsumerPlan.PREMIUM);
        assertThat(ConsumerPlan.fromValue(null)).isEqualTo(ConsumerPlan.FREE);
    }

    @Test
    void premiumStrictOverrideWinsOverPreferDefault() {
        UUID id = UUID.randomUUID();
        when(subscriptionService.resolvePlan(id)).thenReturn(ConsumerPlan.PREMIUM);
        when(userAccountRepository.findById(id)).thenReturn(Optional.of(
                UserAccount.builder()
                        .id(id)
                        .consumerPlan(ConsumerPlan.PREMIUM)
                        .coherenceModeOverride(OutfitCoherenceMode.STRICT)
                        .build()));
        assertThat(service.resolveCoherenceModeForUser(id)).isEqualTo(OutfitCoherenceMode.STRICT);
    }

    @Test
    void freePlanIgnoresStrictOverride() {
        assertThat(service.resolveCoherenceMode(ConsumerPlan.FREE, OutfitCoherenceMode.STRICT))
                .isEqualTo(OutfitCoherenceMode.OFF);
    }

    @Test
    void premiumPreferenceScaleIsStrongerThanFree() {
        properties.getConsumer().setFreePreferenceScale(1.0);
        properties.getConsumer().setPremiumPreferenceScale(1.75);
        assertThat(properties.getConsumer().getPremiumPreferenceScale())
                .isGreaterThan(properties.getConsumer().getFreePreferenceScale());
        assertThat(service.resolveCoherenceMode(ConsumerPlan.PREMIUM)).isEqualTo(OutfitCoherenceMode.PREFER);
        assertThat(service.resolveCoherenceMode(ConsumerPlan.FREE)).isEqualTo(OutfitCoherenceMode.OFF);
        // No RequestContext user → Free scale
        assertThat(service.resolvePreferenceScaleForCurrentUser()).isEqualTo(1.0);
    }

    @Test
    void freeUserWardrobeModesFallBackToBrandOnly() {
        UUID id = UUID.randomUUID();
        when(subscriptionService.resolvePlan(id)).thenReturn(ConsumerPlan.FREE);
        assertThat(service.effectiveWardrobeMode(WardrobeMode.USE_WARDROBE_FIRST, id))
                .isEqualTo(WardrobeMode.NO_WARDROBE_DATA);
        assertThat(service.effectiveWardrobeMode(WardrobeMode.MIX_WARDROBE_AND_BRAND, id))
                .isEqualTo(WardrobeMode.NO_WARDROBE_DATA);
        assertThat(service.effectiveWardrobeMode(WardrobeMode.NEW_ITEMS_ONLY, id)).isEqualTo(WardrobeMode.NEW_ITEMS_ONLY);
        assertThat(service.effectiveWardrobeMode(null, null)).isEqualTo(WardrobeMode.NO_WARDROBE_DATA);
    }

    @Test
    void premiumUserKeepsWardrobeMode() {
        UUID id = UUID.randomUUID();
        when(subscriptionService.resolvePlan(id)).thenReturn(ConsumerPlan.PREMIUM);
        assertThat(service.effectiveWardrobeMode(WardrobeMode.USE_WARDROBE_FIRST, id))
                .isEqualTo(WardrobeMode.USE_WARDROBE_FIRST);
    }

    @Test
    void anonymousCallerIsRejectedForPremiumFeature() {
        assertThatThrownBy(() -> service.requirePremium("Tủ đồ là tính năng của FitMe Premium"))
                .isInstanceOf(PremiumRequiredException.class)
                .hasMessageContaining("FitMe Premium");
    }

    @Test
    void disabledEntitlementsOpenPremiumFeaturesToEveryone() {
        properties.getConsumer().setEntitlementEnabled(false);
        assertThat(service.isPremium(null)).isTrue();
        assertThat(service.effectiveWardrobeMode(WardrobeMode.USE_WARDROBE_FIRST, null))
                .isEqualTo(WardrobeMode.USE_WARDROBE_FIRST);
    }

    @Test
    void upsellMessageReadsPriceAndFitkenFromPlan() {
        BillingPlan plan = BillingPlan.builder().priceVnd(49_000L).quotaAmount(15).build();
        assertThat(ConsumerEntitlementService.upsellMessage(plan))
                .contains("FitMe Premium")
                .contains("49.000đ")
                .contains("15 Fitken")
                .doesNotContain("Plus");
    }
}
