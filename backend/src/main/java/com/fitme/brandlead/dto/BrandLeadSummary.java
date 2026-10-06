package com.fitme.brandlead.dto;

/** Brand-wide lead counts, independent of the list filters. */
public record BrandLeadSummary(long total, long sold, long last30Days) {
}
