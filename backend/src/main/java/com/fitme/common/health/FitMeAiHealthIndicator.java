package com.fitme.common.health;

import com.fitme.common.config.FitMeProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FitMeAiHealthIndicator implements HealthIndicator {

    private final FitMeProperties properties;

    @Override
    public Health health() {
        var ai = properties.getAi();
        return Health.up()
                .withDetail("aiMode", ai.getMode())
                .withDetail("stylistMode", ai.getStylistMode())
                .withDetail("geminiConfigured", ai.isGeminiStylistEnabled())
                .withDetail("storageMode", properties.getStorage().getMode())
                .build();
    }
}
