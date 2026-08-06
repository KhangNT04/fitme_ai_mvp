package com.fitme.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.ai.VtonCategoryMapper;
import com.fitme.common.config.FitMeProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiVtonClient {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final FitMeProperties properties;

    public VtonJobResponse submitJob(
            String personImageUrl, String garmentImageUrl, String category, String garmentDescription) {
        RestClient client = restClient();
        try {
            java.util.HashMap<String, Object> body = new java.util.HashMap<>();
            body.put("person_image_url", personImageUrl);
            body.put("garment_image_url", garmentImageUrl);
            body.put("category", category);
            body.put("mode", "balanced");
            if (garmentDescription != null && !garmentDescription.isBlank()) {
                body.put("garment_description", garmentDescription);
            }
            return client.post()
                    .uri("/v1/try-on")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(VtonJobResponse.class);
        } catch (RestClientResponseException ex) {
            log.warn("VTON submit failed: {} body={}", ex.getMessage(), ex.getResponseBodyAsString());
            return parseFailureResponse(ex.getResponseBodyAsString(), ex.getMessage());
        } catch (RestClientException ex) {
            log.warn("VTON submit failed: {}", ex.getMessage());
            return parseFailureResponse(null, ex.getMessage());
        }
    }

    /**
     * Submits a full outfit (2+ garments) as one ai-vton job. The underlying VTON
     * provider (FASHN or otherwise) still only accepts one garment per call, so
     * ai-vton applies these sequentially — output of step N becomes the person
     * photo for step N+1 — and reports back a single job id to poll.
     */
    public VtonJobResponse submitSequentialJob(
            String personImageUrl, List<VtonCategoryMapper.GarmentSelection> garments) {
        RestClient client = restClient();
        try {
            var garmentPayload = garments.stream()
                    .map(garment -> {
                        java.util.HashMap<String, Object> item = new java.util.HashMap<>();
                        item.put("garment_image_url", garment.garmentImageUrl());
                        item.put("category", garment.category());
                        if (garment.productName() != null && !garment.productName().isBlank()) {
                            item.put("garment_description", garment.productName());
                        }
                        return item;
                    })
                    .toList();
            java.util.HashMap<String, Object> body = new java.util.HashMap<>();
            body.put("person_image_url", personImageUrl);
            body.put("garments", garmentPayload);
            body.put("mode", "balanced");
            return client.post()
                    .uri("/v1/try-on")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(VtonJobResponse.class);
        } catch (RestClientResponseException ex) {
            log.warn("VTON sequential submit failed: {} body={}", ex.getMessage(), ex.getResponseBodyAsString());
            return parseFailureResponse(ex.getResponseBodyAsString(), ex.getMessage());
        } catch (RestClientException ex) {
            log.warn("VTON sequential submit failed: {}", ex.getMessage());
            return parseFailureResponse(null, ex.getMessage());
        }
    }

    /**
     * Builds a failed {@link VtonJobResponse} from an ai-vton error response body when
     * possible, so callers get the real {@code error_code}/{@code error_message} (e.g.
     * {@code UNSUPPORTED_CATEGORY}, {@code INVALID_IMAGE}) instead of a generic
     * {@code PROVIDER_ERROR} with a raw HTTP exception message. ai-vton returns FastAPI's
     * {@code {"detail": {"error_code": ..., "error_message": ...}}} shape for validation
     * errors (422/400) and a flat {@code {"error_code": ..., "error_message": ...}} for
     * others — both are handled here.
     */
    static VtonJobResponse parseFailureResponse(String responseBody, String fallbackMessage) {
        VtonJobResponse failed = new VtonJobResponse();
        failed.setStatus("failed");
        if (responseBody != null && !responseBody.isBlank()) {
            try {
                JsonNode root = OBJECT_MAPPER.readTree(responseBody);
                JsonNode detail = root.has("detail") ? root.get("detail") : root;
                String code = textOrNull(detail, "error_code");
                String message = textOrNull(detail, "error_message");
                if (code != null || message != null) {
                    failed.setErrorCode(code != null ? code : "PROVIDER_ERROR");
                    failed.setErrorMessage(message != null ? message : fallbackMessage);
                    return failed;
                }
            } catch (Exception ignored) {
                // Not JSON, or not the expected shape — fall through to the generic case.
            }
        }
        failed.setErrorCode("PROVIDER_ERROR");
        failed.setErrorMessage(fallbackMessage);
        return failed;
    }

    private static String textOrNull(JsonNode node, String field) {
        if (node == null || !node.hasNonNull(field)) {
            return null;
        }
        String value = node.get(field).asText(null);
        return (value == null || value.isBlank()) ? null : value;
    }

  /**
   * Poll ai-vton job status. Returns {@code null} on transient network errors so callers keep waiting.
   */
    public VtonJobResponse pollJob(String jobId) {
        RestClient client = restClient();
        try {
            return client.get()
                    .uri("/v1/try-on/{jobId}", jobId)
                    .retrieve()
                    .body(VtonJobResponse.class);
        } catch (RestClientException ex) {
            log.warn("VTON poll transient error for {}: {}", jobId, ex.getMessage());
            return null;
        }
    }

    public boolean isMockMode() {
        return "mock".equalsIgnoreCase(properties.getAi().getMode());
    }

    public boolean isRemoteMode() {
        String mode = properties.getAi().getMode();
        return "api".equalsIgnoreCase(mode)
                || "local".equalsIgnoreCase(mode)
                || "hf".equalsIgnoreCase(mode);
    }

    /** True when backend should call the VTON microservice (mock returns a demo composite). */
    public boolean isVtonEnabled() {
        String mode = properties.getAi().getMode();
        if (mode == null || mode.isBlank()) {
            return false;
        }
        String normalized = mode.trim().toLowerCase(java.util.Locale.ROOT);
        return "mock".equals(normalized) || isRemoteMode();
    }

    private RestClient restClient() {
        // Spring's default JdkClientHttpRequestFactory (java.net.http.HttpClient) streams POST
        // bodies with `Transfer-Encoding: chunked`, which uvicorn/httptools in ai-vton fails to
        // parse (request arrives with an empty body → FastAPI 422 "body: Field required").
        // SimpleClientHttpRequestFactory buffers the body and sends a plain Content-Length
        // request instead, which ai-vton parses correctly.
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setBufferRequestBody(true);
        return RestClient.builder()
                .baseUrl(properties.getAi().getVtonBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class VtonJobResponse {
        @JsonProperty("job_id")
        private String jobId;
        private String status;
        @JsonProperty("output_image_url")
        private String outputImageUrl;
        @JsonProperty("error_code")
        private String errorCode;
        @JsonProperty("error_message")
        private String errorMessage;
        @JsonProperty("fallback_mode")
        private String fallbackMode;
        // Multi-garment sequential jobs only — 1-indexed current step, total steps,
        // and the FASHN category being applied right now (e.g. "tops", "bottoms").
        private Integer step;
        @JsonProperty("total_steps")
        private Integer totalSteps;
        @JsonProperty("current_category")
        private String currentCategory;
    }
}
