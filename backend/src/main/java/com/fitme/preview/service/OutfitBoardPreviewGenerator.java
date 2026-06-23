package com.fitme.preview.service;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Primary
public class OutfitBoardPreviewGenerator implements PreviewGenerator {

    @Override
    public PreviewResult generate(PreviewRequest request) {
        String mockUrl = "https://picsum.photos/seed/preview-" + UUID.randomUUID() + "/600/800";
        return new PreviewResult(mockUrl,
                "Ảnh minh họa bằng AI, dùng để tham khảo. Form thực tế có thể khác tùy chất liệu, bảng size và cách mặc.");
    }
}
