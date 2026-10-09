package com.fitme.billing.config;

import com.fitme.common.config.FitMeProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PayOsProductionGuardTest {

    @Test
    void refusesTheMockUnderProd() {
        FitMeProperties.Payos payos = payos(true, "checksum");
        assertThatThrownBy(() -> PayOsProductionGuard.check(payos))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PAYOS_MOCK");
    }

    @Test
    void refusesABlankChecksumKeyUnderProd() {
        assertThatThrownBy(() -> PayOsProductionGuard.check(payos(false, " ")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("PAYOS_CHECKSUM_KEY");
        assertThatThrownBy(() -> PayOsProductionGuard.check(payos(false, null)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void acceptsLivePayOs() {
        assertThatCode(() -> PayOsProductionGuard.check(payos(false, "checksum"))).doesNotThrowAnyException();
    }

    private static FitMeProperties.Payos payos(boolean mock, String checksumKey) {
        FitMeProperties.Payos payos = new FitMeProperties.Payos();
        payos.setMock(mock);
        payos.setChecksumKey(checksumKey);
        return payos;
    }
}
