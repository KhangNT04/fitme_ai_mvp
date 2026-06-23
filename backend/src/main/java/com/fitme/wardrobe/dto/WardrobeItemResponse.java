package com.fitme.wardrobe.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class WardrobeItemResponse {
    private UUID id;
    private String name;
    private String itemType;
    private String category;
    private String color;
    private String material;
    private String fitType;
    private List<String> styleTags;
    private String imageUrl;
    private Instant createdAt;
}
