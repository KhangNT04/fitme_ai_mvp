package com.fitme.preview.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PhotoUploadResponse {
    private UUID id;
    private String fileUrl;
    private String qualityStatus;
    private String status;
}
