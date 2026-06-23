package com.fitme.preview.service;

import com.fitme.common.enums.PreviewType;

import java.util.UUID;

public interface PreviewGenerator {

    PreviewResult generate(PreviewRequest request);

    record PreviewRequest(UUID recommendationId, UUID tryOnRequestId, UUID photoUploadId, PreviewType previewType) {}

    record PreviewResult(String imageUrl, String disclaimer) {}
}
