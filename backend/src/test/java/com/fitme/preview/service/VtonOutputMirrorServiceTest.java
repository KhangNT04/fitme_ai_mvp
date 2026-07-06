package com.fitme.preview.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class VtonOutputMirrorServiceTest {

    @Test
    void isEphemeralVtonOutputUrl_detectsAiVtonOutputs() {
        assertThat(VtonOutputMirrorService.isEphemeralVtonOutputUrl(
                "https://fitme-ai-vton.onrender.com/outputs/abc.jpg")).isTrue();
    }

    @Test
    void isEphemeralVtonOutputUrl_ignoresPersistedUploads() {
        assertThat(VtonOutputMirrorService.isEphemeralVtonOutputUrl(
                "https://fitme-ai-mvp.onrender.com/uploads/vton-results/abc.jpg")).isFalse();
    }

    @Test
    void isEphemeralVtonOutputUrl_ignoresRelativePath() {
        assertThat(VtonOutputMirrorService.isEphemeralVtonOutputUrl(
                "/uploads/vton-results/abc.jpg")).isFalse();
    }
}
