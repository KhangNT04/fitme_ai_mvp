package com.fitme.brand.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class BrandResponse {
    private UUID id;
    private String name;
    private String description;
    private String logoUrl;
    private String websiteUrl;
    private String shopeeUrl;
    private String tiktokShopUrl;
    private String instagramUrl;
    private String facebookUrl;
    private String contactEmail;
    private String contactPhone;
    private String status;
    private Instant createdAt;
}
