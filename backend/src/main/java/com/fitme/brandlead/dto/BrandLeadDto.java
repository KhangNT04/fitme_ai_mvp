package com.fitme.brandlead.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * One customer who clicked buy on the brand's product. {@code customerName} / {@code customerEmail} are null unless
 * {@code customerStatus} is VISIBLE.
 */
public record BrandLeadDto(
        UUID id,
        UUID productId,
        String productName,
        String customerName,
        String customerEmail,
        CustomerStatus customerStatus,
        String size,
        String color,
        Instant createdAt,
        Instant confirmedSoldAt
) {

    public enum CustomerStatus {
        VISIBLE,
        /** The customer withdrew BRAND_LEAD_SHARING after clicking. */
        WITHDRAWN,
        /** The customer's data was erased. */
        ANONYMIZED
    }
}
