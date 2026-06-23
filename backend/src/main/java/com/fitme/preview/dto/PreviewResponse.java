package com.fitme.preview.dto;

import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PreviewResponse {
    private UUID id;
    private PreviewType previewType;
    private PreviewStatus status;
    private String previewImageUrl;
    private String errorMessage;
    private String disclaimer;
}
