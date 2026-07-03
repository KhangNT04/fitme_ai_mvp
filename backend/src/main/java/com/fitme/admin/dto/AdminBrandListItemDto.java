package com.fitme.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class AdminBrandListItemDto {
    private UUID id;
    private String name;
    private String contactEmail;
    private String status;
    private Instant createdAt;
    private int totalQuotaRemaining;
    private String activePlanName;
    private boolean dashboardEnabled;
}
