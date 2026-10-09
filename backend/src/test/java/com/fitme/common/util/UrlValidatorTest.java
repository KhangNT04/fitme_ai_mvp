package com.fitme.common.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class UrlValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "https://shopee.vn/product-1",
            "http://example.com/path",
            "https://example.com:8080/path?query=1",
            "  https://example.com  "
    })
    void isValidHttpUrl_validUrls_returnsTrue(String url) {
        assertTrue(UrlValidator.isValidHttpUrl(url));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "   ",
            "javascript:alert(1)",
            "data:text/html,test",
            "ftp://example.com",
            "not-a-url",
            "://missing-scheme"
    })
    void isValidHttpUrl_invalidUrls_returnsFalse(String url) {
        assertFalse(UrlValidator.isValidHttpUrl(url));
    }

    @Test
    void isValidHttpUrl_null_returnsFalse() {
        assertFalse(UrlValidator.isValidHttpUrl(null));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "https://picsum.photos/400/500",
            "https://pub-123.r2.dev/brands/products/a.jpg",
            "http://localhost:8080/uploads/brands/products/a.jpg",
            "/uploads/brands/products/a.jpg",
            "/catalog/brand-x/shirt.jpg"
    })
    void isValidImageUrl_acceptsHttpAndFitMeMediaPaths(String url) {
        assertTrue(UrlValidator.isValidImageUrl(url));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "javascript:alert(1)",
            "JavaScript:alert(1)",
            "data:image/png;base64,AAAA",
            "file:///etc/passwd",
            "ftp://example.com/a.jpg",
            "//evil.example.com/a.jpg",
            "/uploads/../secrets.txt",
            "/etc/passwd",
            "image.jpg"
    })
    void isValidImageUrl_rejectsDangerousOrForeignSchemes(String url) {
        assertFalse(UrlValidator.isValidImageUrl(url));
    }
}
