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
    private boolean dashboardEnabled;
    private boolean plusActive;
    /** End of the brand's latest Brand Plus period (may be in the past); null if never bought. */
    private Instant plusEndsAt;
}
