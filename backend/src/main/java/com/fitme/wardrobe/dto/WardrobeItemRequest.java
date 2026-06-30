package com.fitme.wardrobe.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class WardrobeItemRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String itemType;
    @NotBlank
    private String category;
    private String color;
    private String material;
    private String fitType;
    private List<String> styleTags;
}
