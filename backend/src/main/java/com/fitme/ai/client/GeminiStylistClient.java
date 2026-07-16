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

    /**
     * Lightweight topic classifier. Returns empty when Gemini is disabled or call fails
     * (caller should treat empty as off-topic / reject to save tokens).
     */
    public Optional<Boolean> classifyFashionTopic(String message) {
        if (!properties.getAi().isGeminiStylistEnabled()) {
            return Optional.empty();
        }
        try {
            String prompt = """
                    Bạn là bộ lọc chủ đề. Tin nhắn có liên quan tư vấn thời trang/phối đồ/outfit/size/màu không?
                    Trả JSON: {"onTopic": true|false}
                    Tin nhắn: %s
                    """.formatted(message);
            Map<String, Object> generationConfig = new LinkedHashMap<>();
            generationConfig.put("responseMimeType", "application/json");
            generationConfig.put("responseSchema", Map.of(
                    "type", "OBJECT",
                    "properties", Map.of("onTopic", Map.of("type", "BOOLEAN")),
                    "required", List.of("onTopic")));
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", List.of(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", prompt)))));
            body.put("generationConfig", generationConfig);

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
            String text = response.getCandidates().getFirst().getContent().getParts().getFirst().getText();
            if (text == null || text.isBlank()) {
                return Optional.empty();
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(text, Map.class);
            Object onTopic = parsed.get("onTopic");
            if (onTopic instanceof Boolean b) {
                return Optional.of(b);
            }
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Gemini topic classify failed: {}", ex.getMessage());
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
                Bạn là stylist/nhân viên tư vấn thời trang của FitMe, nói chuyện trực tiếp với khách bằng tiếng Việt tự nhiên (xưng "em" với khách).
                Tổng hợp toàn bộ dữ liệu user trong JSON: số đo, tuổi (user.age), giới tính, fit, goals, stylingGuidance.
                Đọc stylingGuidance.summaryVi và tuân thủ: outfit phải phù hợp độ tuổi và hồ sơ thực tế.
                Nếu user.age >= 45 và stylingGuidance.youthfulLookRequested=false: KHÔNG gợi ý set quá trẻ (streetwear/hoodie/oversize/graphic tee/crop) trừ khi request.userMessage hoặc conversationHistory yêu cầu rõ.
                Chỉ khi khách nói muốn "trẻ trung", "streetwear", "cá tính", "nổi bật"… mới được ưu tiên look trẻ hơn tuổi.
                Nếu có request.userMessage, ưu tiên ý định trong tin nhắn đó (dịp mặc, vibe, style) nhưng vẫn phải hợp lý với user.age và stylingGuidance.
                Bắt buộc tạo outfit đúng phong cách style.targetStyle (ví dụ Minimal, Korean Casual, Streetwear, Office Chic). Title nên nhắc phong cách đó.
                QUAN TRỌNG — giới tính: nếu user.gender=MALE thì KHÔNG chọn váy/chân váy/đầm (category Váy, role ONE_PIECE nữ); chỉ chọn TOP+BOTTOM nam hoặc UNISEX.
                Nếu user.gender=FEMALE thì tránh sản phẩm targetGender=MALE. Chỉ chọn productId có trong candidates và phù hợp targetGender.
                Ưu tiên set TOP+BOTTOM+SHOES hoặc ONE_PIECE (chỉ khi hợp giới tính); có thể thêm OUTERWEAR.
                Nếu có selectedProductId, giữ sản phẩm đó khi hợp lệ.
                Nếu có user.age, bắt buộc cân nhắc độ tuổi khi chọn form và vibe — không giảng bài về tuổi nhưng outfit phải trông hợp lý với khách.

                explanation.narrative: viết tiếng Việt, 2 đoạn (cách nhau bằng xuống dòng), theo mẫu tự nhiên sau:
                Đoạn 1: mở bằng "Với dáng người cao khoảng …, nặng …kg và thích mặc …" (chỉ lồng số đo cần thiết); gợi ý combo bằng tên sản phẩm thường (không dùng ngoặc vuông); nêu cảm giác set theo phong cách targetStyle; gợi ý size chính và size thay thế nếu muốn thoải mái hơn.
                Đoạn 2: mở "Về màu sắc, …" — giải thích vì sao tông màu hợp phong cách; gợi ý giày/phụ kiện hoàn thiện set.

                Tông: như stylist tư vấn thân thiện, không máy móc. KHÔNG dùng "Dạ em đã nhận được thông tin", "Lý do em chọn", checklist "phù hợp dáng/gu/hoàn cảnh", hay ngoặc vuông quanh tên sản phẩm.
                Giới tính: lồng ghép tự nhiên khi cần, không tách câu riêng.

                Trả về đúng JSON schema.
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
                "narrative", Map.of("type", "STRING"),
                "bodyFit", Map.of("type", "STRING"),
                "styleFit", Map.of("type", "STRING"),
                "occasionFit", Map.of("type", "STRING"),
                "colorFit", Map.of("type", "STRING"),
                "wardrobeFit", Map.of("type", "STRING"));
        Map<String, Object> explanationSchema = Map.of(
                "type", "OBJECT",
                "properties", explanationProps,
                "required", List.of("narrative"));

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
