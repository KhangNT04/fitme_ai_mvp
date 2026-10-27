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

    @Test
    void isEphemeralVtonOutputUrl_detectsFashnCdnOutput() {
        assertThat(VtonOutputMirrorService.isEphemeralVtonOutputUrl(
                "https://cdn.fashn.ai/01a11eb2-a653-7152-82b0-50a439696bd0/output_0.png")).isTrue();
    }

    @Test
    void isEphemeralVtonOutputUrl_detectsFashnCdnOutputOverHttp() {
        assertThat(VtonOutputMirrorService.isEphemeralVtonOutputUrl(
                "http://cdn.fashn.ai/01a11eb2/output_0.png")).isTrue();
    }

    @Test
    void isEphemeralVtonOutputUrl_ignoresPersistedR2Output() {
        assertThat(VtonOutputMirrorService.isEphemeralVtonOutputUrl(
                "https://pub-e5533a27e48843939533158fe4fbb1a3.r2.dev/vton-results/abc.jpg")).isFalse();
    }
}
