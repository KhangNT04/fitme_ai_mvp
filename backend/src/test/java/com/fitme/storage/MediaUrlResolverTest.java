package com.fitme.storage;

import com.fitme.common.config.FitMeProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MediaUrlResolverTest {

    private FitMeProperties properties;
    private MediaUrlResolver resolver;

    @BeforeEach
    void setUp() {
        properties = new FitMeProperties();
        resolver = new MediaUrlResolver(properties);
    }

    @Test
    void resolvePublicUrl_uploadsUsesR2WhenConfigured() {
        properties.getStorage().setMode("r2");
        properties.getStorage().getR2().setPublicBaseUrl("https://pub.example.r2.dev");

        String url = resolver.resolvePublicUrl("/uploads/user-photos/abc.jpg");

        assertThat(url).isEqualTo("https://pub.example.r2.dev/user-photos/abc.jpg");
    }

    @Test
    void resolvePublicUrl_catalogUsesFrontendBase() {
        properties.getCors().setOrigins("https://fitme-ai-mvp.vercel.app");
        properties.getAi().setPublicBaseUrl("https://fitme-ai-mvp.onrender.com");

        String url = resolver.resolvePublicUrl("/catalog/products/ksh-ao-thun-cotton.jpg");

        assertThat(url).isEqualTo("https://fitme-ai-mvp.vercel.app/catalog/products/ksh-ao-thun-cotton.jpg");
    }

    @Test
    void resolvePublicUrl_localUploadUsesBackendBase() {
        properties.getStorage().setMode("local");
        properties.getAi().setPublicBaseUrl("https://api.example.com");

        String url = resolver.resolvePublicUrl("/uploads/user-photos/abc.jpg");

        assertThat(url).isEqualTo("https://api.example.com/uploads/user-photos/abc.jpg");
    }

    @Test
    void resolveBackendServedUrl_mapsR2PublicUrlToBackendUploads() {
        properties.getAi().setPublicBaseUrl("https://fitme-ai-mvp.onrender.com");

        String url = resolver.resolveBackendServedUrl(
                "https://pub.example.r2.dev/user-photos/abc.jpg");

        assertThat(url).isEqualTo("https://fitme-ai-mvp.onrender.com/uploads/user-photos/abc.jpg");
    }

    @Test
    void resolvePublicUrl_keepsAbsoluteUrl() {
        String absolute = "https://images.unsplash.com/photo.jpg";
        assertThat(resolver.resolvePublicUrl(absolute)).isEqualTo(absolute);
    }
}
