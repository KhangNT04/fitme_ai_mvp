package com.fitme.brand.entity;

import com.fitme.common.enums.BrandStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "brands")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    @Column(name = "website_url", columnDefinition = "TEXT")
    private String websiteUrl;

    @Column(name = "shopee_url", columnDefinition = "TEXT")
    private String shopeeUrl;

    @Column(name = "tiktok_shop_url", columnDefinition = "TEXT")
    private String tiktokShopUrl;

    @Column(name = "instagram_url", columnDefinition = "TEXT")
    private String instagramUrl;

    @Column(name = "facebook_url", columnDefinition = "TEXT")
    private String facebookUrl;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BrandStatus status = BrandStatus.PENDING;

    /** Stable key of the seed catalog entry this brand comes from; null for brands that signed up themselves. */
    @Column(name = "catalog_key", length = 64)
    private String catalogKey;

    /** True while the brand profile still mirrors the catalog; any edit by the owner hands it over to the brand. */
    @Column(name = "catalog_managed", nullable = false)
    @Builder.Default
    private boolean catalogManaged = false;

    @Column(name = "catalog_hash", length = 64)
    private String catalogHash;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
