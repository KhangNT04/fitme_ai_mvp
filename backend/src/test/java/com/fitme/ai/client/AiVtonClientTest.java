package com.fitme.ai.client;

import com.fitme.ai.client.AiVtonClient.VtonJobResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ai-vton reports structured failures as either FastAPI's validation-error shape
 * ({@code {"detail": {"error_code": ..., "error_message": ...}}}, used for 422/400 by
 * {@code HTTPException(detail={...})}) or a flat {@code {"error_code": ..., "error_message": ...}}.
 * {@link AiVtonClient#parseFailureResponse} must recover the real code/message from both so
 * {@link com.fitme.preview.service.VtonTryOnService} can map it to a Vietnamese toast instead of
 * showing a generic "PROVIDER_ERROR" with a raw HTTP exception message.
 */
class AiVtonClientTest {

    @Test
    void parseFailureResponse_extractsCodeAndMessageFromFastApiDetailShape() {
        String body = """
                {"detail": {"error_code": "UNSUPPORTED_CATEGORY", "error_message": "Category not supported: shoes"}}
                """;

        VtonJobResponse result = AiVtonClient.parseFailureResponse(body, "422 Bad Request");

        assertThat(result.getStatus()).isEqualTo("failed");
        assertThat(result.getErrorCode()).isEqualTo("UNSUPPORTED_CATEGORY");
        assertThat(result.getErrorMessage()).isEqualTo("Category not supported: shoes");
    }

    @Test
    void parseFailureResponse_extractsCodeAndMessageFromFlatShape() {
        String body = """
                {"error_code": "RATE_LIMIT", "error_message": "Too many requests"}
                """;

        VtonJobResponse result = AiVtonClient.parseFailureResponse(body, "429 Too Many Requests");

        assertThat(result.getErrorCode()).isEqualTo("RATE_LIMIT");
        assertThat(result.getErrorMessage()).isEqualTo("Too many requests");
    }

    @Test
    void parseFailureResponse_fallsBackToGenericWhenBodyIsNotJson() {
        VtonJobResponse result = AiVtonClient.parseFailureResponse("<html>502 Bad Gateway</html>", "502 Bad Gateway");

        assertThat(result.getStatus()).isEqualTo("failed");
        assertThat(result.getErrorCode()).isEqualTo("PROVIDER_ERROR");
        assertThat(result.getErrorMessage()).isEqualTo("502 Bad Gateway");
    }

    @Test
    void parseFailureResponse_fallsBackToGenericWhenBodyIsNull() {
        VtonJobResponse result = AiVtonClient.parseFailureResponse(null, "Connection refused");

        assertThat(result.getStatus()).isEqualTo("failed");
        assertThat(result.getErrorCode()).isEqualTo("PROVIDER_ERROR");
        assertThat(result.getErrorMessage()).isEqualTo("Connection refused");
    }

    @Test
    void parseFailureResponse_usesFallbackMessageWhenOnlyCodePresent() {
        String body = """
                {"detail": {"error_code": "UNAUTHORIZED"}}
                """;

        VtonJobResponse result = AiVtonClient.parseFailureResponse(body, "401 Unauthorized");

        assertThat(result.getErrorCode()).isEqualTo("UNAUTHORIZED");
        assertThat(result.getErrorMessage()).isEqualTo("401 Unauthorized");
    }
}
