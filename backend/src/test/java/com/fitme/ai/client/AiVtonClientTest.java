package com.fitme.ai.client;

import com.fitme.ai.client.AiVtonClient.VtonJobResponse;
import com.fitme.common.config.FitMeProperties;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

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
    void submitJob_retriesWhileSleepingHostBootsThenReturnsJob() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/try-on", exchange -> {
            boolean waking = calls.incrementAndGet() == 1;
            byte[] body = (waking ? "Too Many Requests\n" : "{\"job_id\":\"job-1\",\"status\":\"processing\"}")
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", waking ? "text/plain" : "application/json");
            exchange.sendResponseHeaders(waking ? 429 : 200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            AiVtonClient client = new AiVtonClient(propertiesFor(server, 10));

            VtonJobResponse job = client.submitJob("https://p/person.jpg", "https://p/garment.jpg", "tops", "Áo");

            assertThat(job.getJobId()).isEqualTo("job-1");
            assertThat(calls.get()).isEqualTo(2);
        } finally {
            server.stop(0);
        }
    }

    @Test
    void isHostWakingUp_onlyForPlainEdgeResponses() {
        assertThat(AiVtonClient.isHostWakingUp(429, "Too Many Requests")).isTrue();
        assertThat(AiVtonClient.isHostWakingUp(503, "<html>Service Unavailable</html>")).isTrue();
        assertThat(AiVtonClient.isHostWakingUp(429, "{\"error_code\":\"RATE_LIMIT\"}")).isFalse();
        assertThat(AiVtonClient.isHostWakingUp(500, "Internal Server Error")).isFalse();
    }

    @Test
    void publicHealthUrl_onlyForRemoteHttpsHosts() {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setMode("api");
        properties.getAi().setVtonBaseUrl("https://vton.example.com/");
        assertThat(new AiVtonClient(properties).publicHealthUrl()).contains("https://vton.example.com/health");

        properties.getAi().setVtonBaseUrl("http://ai-vton:8001");
        assertThat(new AiVtonClient(properties).publicHealthUrl()).isEmpty();

        properties.getAi().setMode("mock");
        properties.getAi().setVtonBaseUrl("https://vton.example.com");
        assertThat(new AiVtonClient(properties).publicHealthUrl()).isEmpty();
    }

    private static FitMeProperties propertiesFor(HttpServer server, int retrySeconds) {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setMode("api");
        properties.getAi().setVtonBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.getAi().setVtonWakeRetrySeconds(retrySeconds);
        return properties;
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
