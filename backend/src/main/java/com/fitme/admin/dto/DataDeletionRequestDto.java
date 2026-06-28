package com.fitme.admin.dto;

import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.common.enums.DeletionRequestType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DataDeletionRequestDto {
    private UUID id;
    private UUID userId;
    private UUID sessionId;
    private DeletionRequestType requestType;
    private DeletionRequestStatus status;
    private Instant createdAt;
    private Instant completedAt;
}
