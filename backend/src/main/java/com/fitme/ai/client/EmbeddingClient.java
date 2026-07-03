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

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmbeddingClient {

    private final FitMeProperties properties;

    public List<Double> embedText(String text) {
        EmbedResponse response = postEmbed(List.of(text));
        if (response == null || response.getEmbeddings() == null || response.getEmbeddings().isEmpty()) {
            return List.of();
        }
        return response.getEmbeddings().getFirst();
    }

    public double cosineSimilarity(String textA, String textB) {
        SimilarityResponse response = postSimilarity(List.of(textA), List.of(textB));
        if (response == null || response.getSimilarities() == null || response.getSimilarities().isEmpty()) {
            return 0;
        }
        List<Double> row = response.getSimilarities().getFirst();
        return row.isEmpty() ? 0 : row.getFirst();
    }

    public boolean isAvailable() {
        try {
            RestClient.builder()
                    .baseUrl(properties.getAi().getEmbeddingsBaseUrl())
                    .build()
                    .get()
                    .uri("/health")
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (RestClientException ex) {
            log.debug("Embeddings service unavailable: {}", ex.getMessage());
            return false;
        }
    }

    private EmbedResponse postEmbed(List<String> texts) {
        try {
            return restClient().post()
                    .uri("/v1/embed")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("texts", texts))
                    .retrieve()
                    .body(EmbedResponse.class);
        } catch (RestClientException ex) {
            log.warn("Embedding request failed: {}", ex.getMessage());
            return null;
        }
    }

    private SimilarityResponse postSimilarity(List<String> textA, List<String> textB) {
        try {
            return restClient().post()
                    .uri("/v1/similarity")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("text_a", textA, "text_b", textB))
                    .retrieve()
                    .body(SimilarityResponse.class);
        } catch (RestClientException ex) {
            log.warn("Similarity request failed: {}", ex.getMessage());
            return null;
        }
    }

    private RestClient restClient() {
        return RestClient.builder()
                .baseUrl(properties.getAi().getEmbeddingsBaseUrl())
                .build();
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EmbedResponse {
        private List<List<Double>> embeddings;
        private String model;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SimilarityResponse {
        private List<List<Double>> similarities;
    }
}
