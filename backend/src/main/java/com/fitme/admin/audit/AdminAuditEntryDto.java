package com.fitme.admin.audit;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminAuditEntryDto(
        UUID id,
        AdminAuditAction action,
        UUID actorId,
        String actorEmail,
        UUID targetId,
        String targetEmail,
        String details,
        String ipAddress,
        Instant createdAt
) {

    public record Page(List<AdminAuditEntryDto> items, long total, int page, int size) {
    }
}
