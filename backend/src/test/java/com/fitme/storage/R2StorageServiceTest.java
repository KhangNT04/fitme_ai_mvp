package com.fitme.storage;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class R2StorageServiceTest {

    @Test
    void buildPublicUrl_joinsBaseAndKey() {
        assertThat(R2StorageService.buildPublicUrl("https://pub.example.r2.dev", "user-photos/abc.jpg"))
                .isEqualTo("https://pub.example.r2.dev/user-photos/abc.jpg");
    }

    @Test
    void extractObjectKey_fromPublicUrl() {
        assertThat(R2StorageService.extractObjectKey(
                "https://pub.example.r2.dev/user-photos/abc.jpg",
                "https://pub.example.r2.dev"))
                .isEqualTo("user-photos/abc.jpg");
    }

    @Test
    void extractObjectKey_fromStoredPath() {
        assertThat(R2StorageService.extractObjectKey("/uploads/user-photos/abc.jpg", null))
                .isEqualTo("user-photos/abc.jpg");
    }
}
