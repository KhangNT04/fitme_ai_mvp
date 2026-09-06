package com.fitme.tryon.dto;

import com.fitme.common.enums.TryOnPreviewMode;
import lombok.Data;

import java.util.UUID;

@Data
public class GenerateTryOnRequest {
    private TryOnPreviewMode previewMode;
    private UUID photoUploadId;
    private String avatarKey;
}
