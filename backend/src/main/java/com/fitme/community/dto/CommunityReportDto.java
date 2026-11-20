package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class CommunityReportDto {
    private UUID id;
    private UUID reporterUserId;
    private String reporterDisplayName;
    private String targetType;
    private UUID targetId;
    private String reason;
    private String detail;
    private String status;
    private Instant createdAt;
    private Instant resolvedAt;
    private String resolutionNote;
}
