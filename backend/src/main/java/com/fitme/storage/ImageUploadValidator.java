package com.fitme.storage;

import com.fitme.common.exception.BusinessException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

public final class ImageUploadValidator {

    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final String UNSUPPORTED = "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP";
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private ImageUploadValidator() {
    }

    /** The declared content type is client-controlled, so the file signature must match an allowed format too. */
    public static void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Chưa chọn file ảnh");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException("Ảnh tối đa 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BusinessException(UNSUPPORTED);
        }
        if (detectImageType(readHeader(file)) == null) {
            throw new BusinessException(UNSUPPORTED);
        }
    }

    /** @return image/jpeg, image/png or image/webp from the magic bytes, or null for anything else */
    static String detectImageType(byte[] h) {
        if (h.length >= 3 && (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (h.length >= 8 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G'
                && h[4] == 0x0D && h[5] == 0x0A && h[6] == 0x1A && h[7] == 0x0A) {
            return "image/png";
        }
        if (h.length >= 12 && h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F'
                && h[8] == 'W' && h[9] == 'E' && h[10] == 'B' && h[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private static byte[] readHeader(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return in.readNBytes(12);
        } catch (IOException e) {
            throw new BusinessException(UNSUPPORTED);
        }
    }
}
