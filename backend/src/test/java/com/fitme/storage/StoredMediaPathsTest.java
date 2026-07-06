package com.fitme.storage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StoredMediaPathsTest {

    @Test
    void normalizeToUploadPath_keepsRelativePath() {
        assertThat(StoredMediaPaths.normalizeToUploadPath("/uploads/user-photos/a.jpg"))
                .isEqualTo("/uploads/user-photos/a.jpg");
    }

    @Test
    void normalizeToUploadPath_convertsLegacyR2Url() {
        assertThat(StoredMediaPaths.normalizeToUploadPath(
                "https://pub.example.r2.dev/user-photos/a.jpg"))
                .isEqualTo("/uploads/user-photos/a.jpg");
    }
}
