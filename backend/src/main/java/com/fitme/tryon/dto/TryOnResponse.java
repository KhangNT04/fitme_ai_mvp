package com.fitme.tryon.dto;

import com.fitme.common.enums.ItemRole;
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
    private List<TryOnItemDto> items;
    private String previewImageUrl;
    private String disclaimer;

    @Data
    @Builder
    public static class TryOnItemDto {
        private UUID productId;
        private ItemRole role;
        private String selectedSize;
        private String selectedColor;
    }
}
