package com.fitme.settings.dto;

import java.time.Instant;

public record SystemSettingDto(
        String key,
        int value,
        int defaultValue,
        String label,
        String description,
        int min,
        int max,
        Instant updatedAt
) {
}
