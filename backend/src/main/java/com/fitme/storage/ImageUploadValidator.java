package com.fitme.storage;

import com.fitme.common.exception.BusinessException;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;
import java.util.UUID;

public final class ImageUploadValidator {

    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private ImageUploadValidator() {
    }

    public static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Chưa chọn file ảnh");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException("Ảnh tối đa 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP");
        }
    }
}
