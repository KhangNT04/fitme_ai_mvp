package com.fitme.preview.service;

import com.fitme.common.exception.BusinessException;
import com.fitme.tryon.service.TryOnAvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AvatarPreviewGenerator implements PreviewGenerator {

    private final TryOnAvatarService tryOnAvatarService;

    @Override
    public PreviewResult generate(PreviewRequest request) {
        String imageUrl = tryOnAvatarService.findPreviewUrl(request.avatarKey());
        if (imageUrl == null) {
            throw new BusinessException("Avatar mẫu không còn tồn tại, vui lòng chọn avatar khác");
        }
        return new PreviewResult(imageUrl,
                "Minh họa trên avatar mẫu khi AI thử mặc chưa khả dụng — tham khảo tỉ lệ và phối đồ.");
    }
}
