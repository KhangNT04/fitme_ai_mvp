package com.fitme.ai;

import com.fitme.common.enums.TryOnPreviewMode;
import com.fitme.preview.entity.UserPhotoUpload;
import com.fitme.preview.service.PhotoUploadService;
import com.fitme.storage.MediaUrlResolver;
import com.fitme.tryon.entity.TryOnRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VtonImageUrlResolverTest {

    @Mock
    private PhotoUploadService photoUploadService;

    @Mock
    private MediaUrlResolver mediaUrlResolver;

    @InjectMocks
    private VtonImageUrlResolver resolver;

    @Test
    void resolvePersonUrl_avatarMode_returnsPresetUrl() {
        TryOnRequest tryOn = TryOnRequest.builder()
                .previewMode(TryOnPreviewMode.AVATAR)
                .avatarKey("avatar-female-1")
                .build();

        String url = resolver.resolvePersonUrl(tryOn);

        assertThat(url).contains("images.unsplash.com");
    }

    @Test
    void resolvePersonUrl_userPhotoMode_resolvesPublicUploadUrl() {
        UUID uploadId = UUID.randomUUID();
        TryOnRequest tryOn = TryOnRequest.builder()
                .previewMode(TryOnPreviewMode.USER_PHOTO)
                .photoUploadId(uploadId)
                .build();
        UserPhotoUpload upload = UserPhotoUpload.builder()
                .id(uploadId)
                .fileUrl("/uploads/user-photos/test.jpg")
                .build();
        when(photoUploadService.getEntity(uploadId)).thenReturn(upload);
        when(mediaUrlResolver.resolvePublicUrl("/uploads/user-photos/test.jpg"))
                .thenReturn("https://api.example/uploads/user-photos/test.jpg");

        String url = resolver.resolvePersonUrl(tryOn);

        assertThat(url).isEqualTo("https://api.example/uploads/user-photos/test.jpg");
    }
}
