package com.fitme.billing.config;

import com.fitme.common.config.FitMeProperties;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Production must take real payments: refuse to start with the payOS mock or without a checksum key. */
@Component
@Profile("prod")
public class PayOsProductionGuard implements InitializingBean {

    private final FitMeProperties properties;

    public PayOsProductionGuard(FitMeProperties properties) {
        this.properties = properties;
    }

    @Override
    public void afterPropertiesSet() {
        check(properties.getPayos());
    }

    static void check(FitMeProperties.Payos payos) {
        if (payos.isMock()) {
            throw new IllegalStateException("payOS mock is enabled under the prod profile; set PAYOS_MOCK=false");
        }
        if (payos.getChecksumKey() == null || payos.getChecksumKey().isBlank()) {
            throw new IllegalStateException("PAYOS_CHECKSUM_KEY is required under the prod profile");
        }
    }
}
