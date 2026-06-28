package com.fitme.admin.dto;

import com.fitme.common.enums.ConsentType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class ConsentRecordDto {
    private UUID id;
    private UUID userId;
    private UUID sessionId;
    private ConsentType consentType;
    private String consentVersion;
    private boolean accepted;
    private Instant createdAt;
}
