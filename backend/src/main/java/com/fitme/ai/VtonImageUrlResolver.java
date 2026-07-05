package com.fitme.ai;

import com.fitme.common.exception.BusinessException;
import com.fitme.preview.entity.UserPhotoUpload;
import com.fitme.preview.service.PhotoUploadService;
import com.fitme.storage.MediaUrlResolver;
import com.fitme.tryon.entity.TryOnRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class VtonImageUrlResolver {

    private final PhotoUploadService photoUploadService;
    private final MediaUrlResolver mediaUrlResolver;

    public String resolvePersonUrl(TryOnRequest tryOn) {
        UUID photoUploadId = tryOn.getPhotoUploadId();
        if (photoUploadId == null) {
            throw new BusinessException("Cần ảnh người dùng để thử mặc VTON");
        }
        UserPhotoUpload upload = photoUploadService.getEntity(photoUploadId);
        String fileUrl = upload.getFileUrl();
        if (fileUrl == null || fileUrl.isBlank()) {
            throw new BusinessException("Ảnh người dùng không hợp lệ");
        }
        return mediaUrlResolver.resolvePublicUrl(fileUrl);
    }
}
