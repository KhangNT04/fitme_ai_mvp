package com.fitme.preview.service;

import com.fitme.common.enums.PreviewType;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
@RequiredArgsConstructor
public class PreviewGeneratorRouter implements PreviewGenerator {

    private final OutfitBoardPreviewGenerator outfitBoardPreviewGenerator;
    private final AvatarPreviewGenerator avatarPreviewGenerator;
    private final UserPhotoPreviewGenerator userPhotoPreviewGenerator;

    @Override
    public PreviewResult generate(PreviewRequest request) {
        PreviewType type = request.previewType() != null ? request.previewType() : PreviewType.OUTFIT_BOARD;
        return switch (type) {
            case AVATAR -> avatarPreviewGenerator.generate(request);
            case USER_PHOTO_2D -> userPhotoPreviewGenerator.generate(request);
            default -> outfitBoardPreviewGenerator.generate(request);
        };
    }
}
