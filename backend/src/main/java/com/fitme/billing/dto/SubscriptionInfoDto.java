package com.fitme.billing.dto;

import com.fitme.common.enums.ConsumerSubscriptionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SubscriptionInfoDto {
    private UUID planId;
    private String planName;
    private ConsumerSubscriptionStatus status;
    private Instant startsAt;
    private Instant expiresAt;
}
