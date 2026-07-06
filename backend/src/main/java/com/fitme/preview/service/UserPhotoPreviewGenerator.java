package com.fitme.preview.service;

import com.fitme.common.enums.PhotoQualityStatus;
import com.fitme.common.enums.PreviewType;
import com.fitme.preview.entity.UserPhotoUpload;
import com.fitme.storage.StoredMediaPaths;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserPhotoPreviewGenerator implements PreviewGenerator {

    private static final String USER_PHOTO_DISCLAIMER =
            "Ảnh minh họa outfit trên ảnh của bạn — tham khảo phối đồ. Form thực tế có thể khác tùy size và chất liệu.";

    private final PhotoUploadService photoUploadService;
    private final OutfitBoardPreviewGenerator outfitBoardPreviewGenerator;

    @Override
    public PreviewResult generate(PreviewRequest request) {
        if (request.photoUploadId() != null) {
            String userUrl = resolveUserPhotoUrl(request.photoUploadId());
            if (userUrl != null) {
                return new PreviewResult(userUrl, USER_PHOTO_DISCLAIMER);
            }
        }
        if (request.previewType() == PreviewType.USER_PHOTO_2D) {
            PreviewResult board = outfitBoardPreviewGenerator.generate(request);
            return new PreviewResult(board.imageUrl(),
                    "Không tải được ảnh của bạn — " + board.disclaimer());
        }
        return outfitBoardPreviewGenerator.generate(request);
    }

    public String resolveUserPhotoUrl(UUID photoUploadId) {
        try {
            UserPhotoUpload upload = photoUploadService.requireById(photoUploadId);
            if (upload.getQualityStatus() != PhotoQualityStatus.GOOD) {
                return null;
            }
            String fileUrl = StoredMediaPaths.normalizeToUploadPath(upload.getFileUrl());
            if (fileUrl == null || fileUrl.isBlank()) {
                return null;
            }
            return fileUrl;
        } catch (Exception ignored) {
            return null;
        }
    }
}
