package com.fitme.redirect.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FlaggedLinkResponse {
    private UUID id;
    private UUID productId;
    private String productName;
    private String url;
    private String reason;
    private String status;
    private Instant createdAt;
}
