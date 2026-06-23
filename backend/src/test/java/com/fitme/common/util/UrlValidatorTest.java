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
}
