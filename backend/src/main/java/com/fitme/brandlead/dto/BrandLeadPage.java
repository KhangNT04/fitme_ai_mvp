package com.fitme.brandlead.dto;

import java.util.List;

/** Without Brand Plus only {@code summary} is filled and {@code plusRequired} is true. */
public record BrandLeadPage(
        boolean plusRequired,
        BrandLeadSummary summary,
        List<BrandLeadDto> items,
        int page,
        int size,
        long totalItems,
        int totalPages
) {
}
