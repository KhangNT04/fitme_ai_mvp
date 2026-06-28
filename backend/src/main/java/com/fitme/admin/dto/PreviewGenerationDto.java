package com.fitme.admin.dto;

import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PreviewGenerationDto {
    private UUID id;
    private UUID recommendationId;
    private UUID tryOnRequestId;
    private UUID photoUploadId;
    private PreviewType previewType;
    private PreviewStatus status;
    private String previewImageUrl;
    private String errorMessage;
    private String disclaimer;
    private Instant createdAt;
    private Instant updatedAt;
}
