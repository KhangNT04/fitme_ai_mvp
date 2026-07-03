package com.fitme.tryon.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class OutfitSuggestionsRequest {
    private List<UUID> productIds;
}
