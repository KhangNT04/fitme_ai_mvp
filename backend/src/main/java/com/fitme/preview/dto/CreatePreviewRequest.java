package com.fitme.preview.dto;

import com.fitme.common.enums.PreviewType;
import lombok.Data;

import java.util.UUID;

@Data
public class CreatePreviewRequest {
    private UUID recommendationId;
    private UUID tryOnRequestId;
    private UUID photoUploadId;
    private PreviewType previewType;
}
