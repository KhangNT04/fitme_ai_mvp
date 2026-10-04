package com.fitme.logistics.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "fitme.logistics")
public class LogisticsProperties {
    private String webhookToken = "dev-logistics-token";
}
