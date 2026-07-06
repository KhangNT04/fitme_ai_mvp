package com.fitme.preview.service;

import com.fitme.storage.MediaUrlResolver;
import com.fitme.storage.StorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VtonOutputMirrorServiceTest {

    @Mock
    private StorageService storageService;

    @Mock
    private MediaUrlResolver mediaUrlResolver;

    @InjectMocks
    private VtonOutputMirrorService mirrorService;

    @Test
    void persistRemoteOutput_skipsAlreadyMirroredPath() throws Exception {
        UUID previewId = UUID.randomUUID();
        String existing = "/uploads/vton-results/" + previewId + ".jpg";
        when(mediaUrlResolver.resolveBackendServedUrl(existing)).thenReturn("https://api.example" + existing);

        String result = mirrorService.persistRemoteOutput(existing, previewId);

        assertThat(result).isEqualTo("https://api.example/uploads/vton-results/" + previewId + ".jpg");
    }

    @Test
    void persistRemoteOutput_skipsAlreadyMirroredAbsoluteUrl() throws Exception {
        UUID previewId = UUID.randomUUID();
        String existing = "https://api.example/uploads/vton-results/" + previewId + ".jpg";
        when(mediaUrlResolver.resolveBackendServedUrl("/uploads/vton-results/" + previewId + ".jpg"))
                .thenReturn(existing);

        String result = mirrorService.persistRemoteOutput(existing, previewId);

        assertThat(result).isEqualTo(existing);
    }
}
