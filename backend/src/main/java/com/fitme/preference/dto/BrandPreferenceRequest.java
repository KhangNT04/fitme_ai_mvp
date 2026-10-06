package com.fitme.preference.dto;

import com.fitme.common.enums.BrandMixMode;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/** Validated in BrandPreferenceService after the Premium check, so Free users always get PREMIUM_REQUIRED. */
@Data
public class BrandPreferenceRequest {
    private BrandMixMode mode;
    private List<UUID> brandIds;
}
