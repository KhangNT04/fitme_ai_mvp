package com.fitme.preview.service;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@Primary
public class OutfitBoardPreviewGenerator implements PreviewGenerator {

    private static final List<String> FASHION_PREVIEW_IMAGES = List.of(
            "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1469334031218-e982a37b42b8?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1539105076926-b69edda79625?auto=format&fit=crop&w=600&h=800&q=80");

    @Override
    public PreviewResult generate(PreviewRequest request) {
        String mockUrl = FASHION_PREVIEW_IMAGES.get(
                ThreadLocalRandom.current().nextInt(FASHION_PREVIEW_IMAGES.size()));
        return new PreviewResult(mockUrl,
                "Ảnh minh họa outfit 2D — tham khảo phối đồ và tỉ lệ. Form thực tế có thể khác tùy size và chất liệu.");
    }
}
