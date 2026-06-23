package com.fitme.brand.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BrandOnboardingRequest {
    @NotBlank
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
}
