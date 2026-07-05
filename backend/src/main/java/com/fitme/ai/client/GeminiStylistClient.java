package com.fitme.ai.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.ai.dto.GeminiOutfitSuggestion;
import com.fitme.common.config.FitMeProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiStylistClient {

    private static final String BASE_URL = "https://generativelanguage.googleapis.com";

    private final FitMeProperties properties;
    private final ObjectMapper objectMapper;

    public Optional<GeminiOutfitSuggestion> suggestOutfit(String contextJson) {
        if (!properties.getAi().isGeminiStylistEnabled()) {
            return Optional.empty();
        }
        String text = null;
        try {
            Map<String, Object> body = buildRequestBody(contextJson);
            GeminiApiResponse response = restClient().post()
                    .uri("/v1beta/models/{model}:generateContent?key={key}",
                            properties.getAi().getGeminiModel(),
                            properties.getAi().getGeminiApiKey())
                    .body(body)
                    .retrieve()
                    .body(GeminiApiResponse.class);
            if (response == null || response.getCandidates() == null || response.getCandidates().isEmpty()) {
                return Optional.empty();
            }
            text = response.getCandidates().getFirst().getContent().getParts().getFirst().getText();
            if (text == null || text.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(text, GeminiOutfitSuggestion.class));
        } catch (RestClientException ex) {
            log.warn("Gemini stylist request failed: {}", ex.getMessage());
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Gemini stylist parse failed: {} body={}", ex.getMessage(), truncateForLog(text));
            return Optional.empty();
        }
    }

    private static String truncateForLog(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= 300 ? trimmed : trimmed.substring(0, 300) + "...";
    }

    private RestClient restClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int timeout = properties.getAi().getStylistTimeoutMs();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        return RestClient.builder()
                .baseUrl(BASE_URL)
                .requestFactory(factory)
                .build();
    }

    private Map<String, Object> buildRequestBody(String contextJson) {
        String systemPrompt = """
                Bạn là AI stylist thời trang của FitMe. Phân tích thông tin người dùng và danh sách sản phẩm candidates.
                Chỉ chọn productId có trong candidates. Ưu tiên set đồ gồm TOP+BOTTOM hoặc ONE_PIECE; có thể thêm OUTERWEAR/SHOES.
                Nếu có selectedProductId trong request, giữ sản phẩm đó trong outfit.
                Giải thích ngắn gọn, tự nhiên, tiếng Việt. Trả về đúng JSON schema.
                """;
        Map<String, Object> userPart = Map.of("text", systemPrompt + "\n\nDữ liệu:\n" + contextJson);
        Map<String, Object> content = Map.of("role", "user", "parts", List.of(userPart));

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.put("responseSchema", responseSchema());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("contents", List.of(content));
        body.put("generationConfig", generationConfig);
        return body;
    }

    private Map<String, Object> responseSchema() {
        Map<String, Object> itemProps = Map.of(
                "productId", Map.of("type", "STRING"),
                "role", Map.of("type", "STRING"),
                "selectedSize", Map.of("type", "STRING"),
                "selectedColor", Map.of("type", "STRING"));
        Map<String, Object> itemSchema = Map.of(
                "type", "OBJECT",
                "properties", itemProps,
                "required", List.of("productId", "role"));

        Map<String, Object> explanationProps = Map.of(
                "bodyFit", Map.of("type", "STRING"),
                "styleFit", Map.of("type", "STRING"),
                "occasionFit", Map.of("type", "STRING"),
                "colorFit", Map.of("type", "STRING"),
                "wardrobeFit", Map.of("type", "STRING"));
        Map<String, Object> explanationSchema = Map.of(
                "type", "OBJECT",
                "properties", explanationProps);

        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("title", Map.of("type", "STRING"));
        properties.put("items", Map.of("type", "ARRAY", "items", itemSchema));
        properties.put("recommendedSize", Map.of("type", "STRING"));
        properties.put("alternativeSize", Map.of("type", "STRING"));
        properties.put("recommendedForm", Map.of("type", "STRING"));
        properties.put("recommendedColor", Map.of("type", "STRING"));
        properties.put("confidence", Map.of("type", "STRING"));
        properties.put("explanation", explanationSchema);

        return Map.of(
                "type", "OBJECT",
                "properties", properties,
                "required", List.of("title", "items", "explanation"));
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GeminiApiResponse {
        private List<Candidate> candidates;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        static class Candidate {
            private Content content;
        }

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        static class Content {
            private List<Part> parts;
        }

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        static class Part {
            private String text;
        }
    }
}
