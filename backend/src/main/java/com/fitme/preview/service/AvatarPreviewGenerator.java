package com.fitme.preview.service;

import com.fitme.tryon.support.TryOnAvatarPresets;
import org.springframework.stereotype.Service;

@Service
public class AvatarPreviewGenerator implements PreviewGenerator {

    @Override
    public PreviewResult generate(PreviewRequest request) {
        String imageUrl = TryOnAvatarPresets.isValid(request.avatarKey())
                ? TryOnAvatarPresets.imageUrl(request.avatarKey())
                : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&h=800&q=80";
        return new PreviewResult(imageUrl,
                "Ảnh minh họa trên avatar mẫu — tham khảo phối đồ và tỉ lệ. Không phải hình ảnh cá nhân của bạn.");
    }
}
