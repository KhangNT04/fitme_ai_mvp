package com.fitme.admin.dto;

import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record AdminUserDto(
        UUID id,
        String email,
        String displayName,
        UserRole role,
        UserStatus status,
        boolean emailVerified,
        ConsumerPlan consumerPlan,
        int fitkenBalance,
        Instant createdAt,
        LocalDate lastActiveDate,
        String brandName,
        String signupSource
) {

    public record Page(List<AdminUserDto> items, long total, int page, int size, Summary summary) {
    }

    public record Summary(long totalAccounts, long consumers, long brandOwners, long admins, long suspended,
                          long premiumUsers) {
    }
}
