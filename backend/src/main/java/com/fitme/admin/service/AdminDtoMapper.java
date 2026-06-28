package com.fitme.admin.service;

import com.fitme.admin.dto.ConsentRecordDto;
import com.fitme.admin.dto.DataDeletionRequestDto;
import com.fitme.admin.dto.OccasionRuleDto;
import com.fitme.admin.dto.PreviewGenerationDto;
import com.fitme.admin.dto.StyleRuleDto;
import com.fitme.admin.entity.OccasionRule;
import com.fitme.admin.entity.StyleRule;
import com.fitme.privacy.entity.ConsentRecord;
import com.fitme.privacy.entity.DataDeletionRequest;
import com.fitme.preview.entity.PreviewGeneration;
import org.springframework.stereotype.Component;

@Component
public class AdminDtoMapper {

    public StyleRuleDto toDto(StyleRule rule) {
        return StyleRuleDto.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .keywords(rule.getKeywords())
                .active(rule.isActive())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    public OccasionRuleDto toDto(OccasionRule rule) {
        return OccasionRuleDto.builder()
                .id(rule.getId())
                .name(rule.getName())
                .description(rule.getDescription())
                .keywords(rule.getKeywords())
                .active(rule.isActive())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    public ConsentRecordDto toDto(ConsentRecord record) {
        return ConsentRecordDto.builder()
                .id(record.getId())
                .userId(record.getUserId())
                .sessionId(record.getSessionId())
                .consentType(record.getConsentType())
                .consentVersion(record.getConsentVersion())
                .accepted(record.isAccepted())
                .createdAt(record.getCreatedAt())
                .build();
    }

    public DataDeletionRequestDto toDto(DataDeletionRequest request) {
        return DataDeletionRequestDto.builder()
                .id(request.getId())
                .userId(request.getUserId())
                .sessionId(request.getSessionId())
                .requestType(request.getRequestType())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .completedAt(request.getCompletedAt())
                .build();
    }

    public PreviewGenerationDto toDto(PreviewGeneration preview) {
        return PreviewGenerationDto.builder()
                .id(preview.getId())
                .recommendationId(preview.getRecommendationId())
                .tryOnRequestId(preview.getTryOnRequestId())
                .photoUploadId(preview.getPhotoUploadId())
                .previewType(preview.getPreviewType())
                .status(preview.getStatus())
                .previewImageUrl(preview.getPreviewImageUrl())
                .errorMessage(preview.getErrorMessage())
                .disclaimer(preview.getDisclaimer())
                .createdAt(preview.getCreatedAt())
                .updatedAt(preview.getUpdatedAt())
                .build();
    }
}
