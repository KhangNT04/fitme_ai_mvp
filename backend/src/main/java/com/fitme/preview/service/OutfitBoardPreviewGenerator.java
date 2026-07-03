package com.fitme.preview.service;

import com.fitme.tryon.service.TryOnOutfitCompletionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class OutfitBoardPreviewGenerator implements PreviewGenerator {

    private static final List<String> FASHION_PREVIEW_IMAGES = List.of(
            "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1469334031218-e982a37b42b8?auto=format&fit=crop&w=600&h=800&q=80",
            "https://images.unsplash.com/photo-1539105076926-b69edda79625?auto=format&fit=crop&w=600&h=800&q=80");

    private static final String COMPLETE_DISCLAIMER =
            "Ảnh minh họa outfit 2D — tham khảo phối đồ và tỉ lệ. Form thực tế có thể khác tùy size và chất liệu.";
    private static final String PARTIAL_DISCLAIMER =
            "Ảnh minh họa ghép từ item bạn đã chọn — set chưa đủ, xem gợi ý bổ sung bên dưới. Form thực tế có thể khác tùy size và chất liệu.";

    private final TryOnOutfitCompletionService outfitCompletionService;

    @Override
    public PreviewResult generate(PreviewRequest request) {
        if (request.tryOnRequestId() != null) {
            var completion = outfitCompletionService.analyzeTryOnRequest(request.tryOnRequestId());
            String itemImage = outfitCompletionService.resolvePreviewImageUrl(request.tryOnRequestId());
            if (itemImage != null && !itemImage.isBlank()) {
                return new PreviewResult(itemImage,
                        completion.isOutfitComplete() ? COMPLETE_DISCLAIMER : PARTIAL_DISCLAIMER);
            }
        }

        String mockUrl = FASHION_PREVIEW_IMAGES.get(
                ThreadLocalRandom.current().nextInt(FASHION_PREVIEW_IMAGES.size()));
        return new PreviewResult(mockUrl, COMPLETE_DISCLAIMER);
    }
}
