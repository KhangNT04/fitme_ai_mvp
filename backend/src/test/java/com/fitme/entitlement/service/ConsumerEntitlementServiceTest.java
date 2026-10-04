package com.fitme.entitlement.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.OutfitCoherenceMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
        properties.getConsumer().setPlusCoherenceMode("prefer");
        properties.getConsumer().setEntitlementEnabled(true);
        service = new ConsumerEntitlementService(userAccountRepository, subscriptionService, properties);
    }

    @Test
    void anonymousUserIsFreeWithOffCoherence() {
        assertThat(service.resolvePlan(null)).isEqualTo(ConsumerPlan.FREE);
        assertThat(service.resolveCoherenceMode(ConsumerPlan.FREE)).isEqualTo(OutfitCoherenceMode.OFF);
    }

    @Test
    void proSubscriberGetsPreferCoherence() {
        UUID id = UUID.randomUUID();
        when(subscriptionService.resolvePlan(id)).thenReturn(ConsumerPlan.PRO);
        assertThat(service.resolvePlan(id)).isEqualTo(ConsumerPlan.PRO);
        assertThat(service.resolveCoherenceMode(ConsumerPlan.PRO)).isEqualTo(OutfitCoherenceMode.PREFER);
    }

    @Test
    void legacyPlusValueMapsToPro() {
        assertThat(ConsumerPlan.fromValue("plus")).isEqualTo(ConsumerPlan.PRO);
        assertThat(ConsumerPlan.fromValue(null)).isEqualTo(ConsumerPlan.FREE);
    }

    @Test
    void proStrictOverrideWinsOverPreferDefault() {
        UUID id = UUID.randomUUID();
        when(subscriptionService.resolvePlan(id)).thenReturn(ConsumerPlan.PRO);
        when(userAccountRepository.findById(id)).thenReturn(Optional.of(
                UserAccount.builder()
                        .id(id)
                        .consumerPlan(ConsumerPlan.PRO)
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
    void proPreferenceScaleIsStrongerThanFree() {
        properties.getConsumer().setFreePreferenceScale(1.0);
        properties.getConsumer().setPlusPreferenceScale(1.75);
        assertThat(properties.getConsumer().getPlusPreferenceScale())
                .isGreaterThan(properties.getConsumer().getFreePreferenceScale());
        assertThat(service.resolveCoherenceMode(ConsumerPlan.PRO)).isEqualTo(OutfitCoherenceMode.PREFER);
        assertThat(service.resolveCoherenceMode(ConsumerPlan.FREE)).isEqualTo(OutfitCoherenceMode.OFF);
        // No RequestContext user → Free scale
        assertThat(service.resolvePreferenceScaleForCurrentUser()).isEqualTo(1.0);
    }
}
