package com.fitme.billing.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConsumerPaymentDescriptionTest {

    @Test
    void doesNotRepeatBrandPrefix() {
        assertThat(ConsumerSubscriptionService.paymentDescription("FitMe Premium")).isEqualTo("FitMe Premium");
        assertThat(ConsumerSubscriptionService.paymentDescription("fitme Premium")).isEqualTo("fitme Premium");
    }

    @Test
    void prefixesPlainPlanNames() {
        assertThat(ConsumerSubscriptionService.paymentDescription("Premium 3 tháng")).isEqualTo("FitMe Premium 3 tháng");
        assertThat(ConsumerSubscriptionService.paymentDescription(null)).isEqualTo("FitMe");
    }
}
