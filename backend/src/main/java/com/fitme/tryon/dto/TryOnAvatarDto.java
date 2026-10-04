package com.fitme.tryon.dto;

import java.util.UUID;

public record TryOnAvatarDto(UUID id, String key, String label, String imageUrl, int displayOrder, boolean active) {

    /** Create/update payload; null fields are left unchanged on update. */
    public record Upsert(String label, String imageUrl, Boolean active) {}
}
