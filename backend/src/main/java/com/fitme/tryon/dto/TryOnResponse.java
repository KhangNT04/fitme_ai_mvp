package com.fitme.tryon.dto;

import com.fitme.common.enums.ItemRole;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.enums.TryOnPreviewMode;
import com.fitme.common.enums.TryOnStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TryOnResponse {
    private UUID id;
    private TryOnStatus status;
    private TryOnPreviewMode previewMode;
    private PreviewType previewType;
    private Boolean saved;
    private List<TryOnItemDto> items;
    private Boolean outfitComplete;
    private List<ItemRole> missingRoles;
    private List<String> improvementSuggestions;
    private List<OutfitSuggestionsResponse.SuggestedOutfitItemDto> suggestedItems;
    private String previewImageUrl;
    private String disclaimer;
    private String errorMessage;
    private String previewSource;
    private String recommendedSize;
    private String alternativeSize;
    private String recommendedForm;
    private String recommendedColor;

    @Data
    @Builder
    public static class TryOnItemDto {
        private UUID productId;
        private ItemRole role;
        private String name;
        private String category;
        private String imageUrl;
        private String selectedSize;
        private String selectedColor;
        private String suggestedSize;
        private java.math.BigDecimal price;
        private Boolean canBuy;
    }
}
