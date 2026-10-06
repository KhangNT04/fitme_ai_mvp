package com.fitme.preference.dto;

import com.fitme.common.enums.BrandMixMode;

import java.util.List;
import java.util.UUID;

public record BrandPreferenceResponse(
        BrandMixMode mode,
        List<UUID> brandIds,
        List<BrandRef> brands,
        boolean premium
) {
    public record BrandRef(UUID id, String name, String logoUrl) {
    }
}
