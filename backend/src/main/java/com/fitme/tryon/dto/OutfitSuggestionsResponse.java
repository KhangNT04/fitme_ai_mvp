package com.fitme.tryon.dto;

import com.fitme.common.enums.ItemRole;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OutfitSuggestionsResponse {
    private boolean outfitComplete;
    private List<ItemRole> missingRoles;
    private List<String> improvementSuggestions;
    private List<SuggestedOutfitItemDto> suggestedItems;

    @Data
    @Builder
    public static class SuggestedOutfitItemDto {
        private UUID productId;
        private ItemRole role;
        private String name;
        private String category;
        private String imageUrl;
        private String reason;
    }
}
