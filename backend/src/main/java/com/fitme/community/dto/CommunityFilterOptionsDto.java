package com.fitme.community.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * The filter options a reader can pick from, with the number of public posts behind each.
 *
 * <p>Only values that actually appear on public posts are listed, so the filter never leads
 * to an empty feed.
 */
@Data
@Builder
public class CommunityFilterOptionsDto {
    private List<FilterOption> styles;
    private List<FilterOption> occasions;
    private List<FilterOption> brands;

    @Data
    @Builder
    public static class FilterOption {
        /** The value sent back to the feed endpoint. */
        private String value;
        /** The label shown on the chip. */
        private String label;
        /** How many public posts carry this value. */
        private long count;
    }
}
