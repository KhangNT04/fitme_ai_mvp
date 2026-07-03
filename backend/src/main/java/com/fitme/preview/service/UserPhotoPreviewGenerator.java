package com.fitme.preview.service;

import com.fitme.common.enums.PhotoQualityStatus;
import com.fitme.preview.entity.UserPhotoUpload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class UserPhotoPreviewGenerator implements PreviewGenerator {

    private static final List<String> FALLBACK_IMAGES = List.of(
            "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&h=800&q=80");

    private final PhotoUploadService photoUploadService;
    private final OutfitBoardPreviewGenerator outfitBoardPreviewGenerator;

    @Override
    public PreviewResult generate(PreviewRequest request) {
        if (request.photoUploadId() != null) {
            try {
                UserPhotoUpload upload = photoUploadService.getEntity(request.photoUploadId());
                if (upload.getQualityStatus() == PhotoQualityStatus.GOOD) {
                    String fileUrl = upload.getFileUrl();
                    if (fileUrl != null && !fileUrl.isBlank()) {
                        return new PreviewResult(fileUrl,
                                "Ảnh minh họa outfit trên ảnh của bạn — tham khảo phối đồ. Form thực tế có thể khác tùy size và chất liệu.");
                    }
                }
            } catch (Exception ignored) {
                // Fall through to outfit board mock
            }
        }
        PreviewResult fallback = outfitBoardPreviewGenerator.generate(request);
        String mockUrl = FALLBACK_IMAGES.get(ThreadLocalRandom.current().nextInt(FALLBACK_IMAGES.size()));
        return new PreviewResult(mockUrl,
                fallback.disclaimer() + " (Minh họa trên ảnh bạn — dùng mock khi chưa có VTON thật.)");
    }
}
