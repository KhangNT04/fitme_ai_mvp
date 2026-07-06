package com.fitme.preview.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.ConsentType;
import com.fitme.common.enums.PhotoQualityStatus;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.preview.dto.CreatePreviewRequest;
import com.fitme.preview.dto.PhotoUploadResponse;
import com.fitme.preview.dto.PreviewResponse;
import com.fitme.preview.entity.PreviewGeneration;
import com.fitme.preview.entity.UserPhotoUpload;
import com.fitme.preview.repository.PreviewGenerationRepository;
import com.fitme.preview.repository.UserPhotoUploadRepository;
import com.fitme.privacy.service.PrivacyService;
import com.fitme.storage.StorageService;
import com.fitme.storage.StoredMediaPaths;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhotoUploadService {

    private final UserPhotoUploadRepository uploadRepository;
    private final StorageService storageService;
    private final PrivacyService privacyService;
    private final AnalyticsService analyticsService;

    public PhotoUploadResponse recordConsent() {
        var consent = privacyService.recordConsent(ConsentType.PHOTO_UPLOAD);
        return PhotoUploadResponse.builder()
                .id(consent.getId())
                .status("CONSENTED")
                .build();
    }

    @Transactional
    public PhotoUploadResponse upload(MultipartFile file, UUID consentId) throws IOException {
        if (!privacyService.hasConsent(ConsentType.PHOTO_UPLOAD)) {
            throw new BusinessException("Cần đồng ý upload ảnh trước");
        }
        String path = storageService.store("user-photos", UUID.randomUUID() + "-" + file.getOriginalFilename(), file);
        UserPhotoUpload upload = UserPhotoUpload.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .fileUrl(path)
                .fileType(file.getContentType())
                .consentId(consentId)
                .qualityStatus(PhotoQualityStatus.PENDING)
                .status("UPLOADED")
                .build();
        upload = uploadRepository.save(upload);
        analyticsService.track("PHOTO_UPLOADED", upload.getUserId(), upload.getSessionId(),
                null, null, null, null, null);
        return toResponse(upload);
    }

    public PhotoUploadResponse checkQuality(UUID id) {
        UserPhotoUpload upload = getOwned(id);
        if (upload.getQualityStatus() == PhotoQualityStatus.PENDING) {
            upload.setQualityStatus(PhotoQualityStatus.GOOD);
            uploadRepository.save(upload);
        }
        return toResponse(upload);
    }

    @Transactional
    public void delete(UUID id) throws IOException {
        UserPhotoUpload upload = getOwned(id);
        storageService.delete(upload.getFileUrl());
        upload.setStatus("DELETED");
        upload.setDeletedAt(Instant.now());
        uploadRepository.save(upload);
    }

    public UserPhotoUpload getEntity(UUID id) {
        return getOwned(id);
    }

    /** Server-side paths (VTON fallback, preview jobs) without request session. */
    public UserPhotoUpload requireById(UUID id) {
        return uploadRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ảnh không tồn tại"));
    }

    private UserPhotoUpload getOwned(UUID id) {
        UserPhotoUpload upload = uploadRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ảnh không tồn tại"));
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId != null && userId.equals(upload.getUserId())) return upload;
        if (sessionId != null && sessionId.equals(upload.getSessionId())) return upload;
        throw new BusinessException("Không có quyền truy cập ảnh này");
    }

    private PhotoUploadResponse toResponse(UserPhotoUpload upload) {
        return PhotoUploadResponse.builder()
                .id(upload.getId())
                .fileUrl(StoredMediaPaths.normalizeToUploadPath(upload.getFileUrl()))
                .qualityStatus(upload.getQualityStatus().name())
                .status(upload.getStatus())
                .build();
    }
}
