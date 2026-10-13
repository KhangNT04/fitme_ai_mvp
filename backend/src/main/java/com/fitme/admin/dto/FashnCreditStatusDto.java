package com.fitme.admin.dto;

import java.time.Instant;

/**
 * FASHN API balance for the admin portal. {@code consumed*} come from our own periodic balance readings
 * (top-ups excluded); {@code trackedSince} is the oldest reading they are based on.
 */
public record FashnCreditStatusDto(
        String aiMode,
        boolean configured,
        boolean available,
        Integer total,
        Integer subscription,
        Integer onDemand,
        String errorCode,
        String errorMessage,
        int lowThreshold,
        boolean low,
        int consumed7d,
        int consumed30d,
        Double averageDailyUsage,
        Integer estimatedDaysLeft,
        Instant trackedSince,
        long aiTryOns7d,
        long aiTryOns30d,
        Instant checkedAt,
        String topUpUrl) {
}
