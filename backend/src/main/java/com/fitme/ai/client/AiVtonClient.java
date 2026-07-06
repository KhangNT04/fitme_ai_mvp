package com.fitme.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fitme.common.config.FitMeProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiVtonClient {

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
        } catch (RestClientException ex) {
            log.warn("VTON submit failed: {}", ex.getMessage());
            VtonJobResponse failed = new VtonJobResponse();
            failed.setStatus("failed");
            failed.setErrorCode("PROVIDER_ERROR");
            failed.setErrorMessage(ex.getMessage());
            return failed;
        }
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
        return RestClient.builder()
                .baseUrl(properties.getAi().getVtonBaseUrl())
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
    }
}
