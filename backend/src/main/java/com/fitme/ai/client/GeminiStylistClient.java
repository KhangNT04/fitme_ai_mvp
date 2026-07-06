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
                Bạn là stylist/nhân viên tư vấn thời trang của FitMe, nói chuyện trực tiếp với khách bằng tiếng Việt tự nhiên (xưng "em" với khách).
                Tổng hợp thông tin từ user (số đo, giới tính, gu, hoàn cảnh), style profile, tủ đồ và candidates trong dữ liệu JSON.
                QUAN TRỌNG — giới tính: nếu user.gender=MALE thì KHÔNG chọn váy/chân váy/đầm (category Váy, role ONE_PIECE nữ); chỉ chọn TOP+BOTTOM nam hoặc UNISEX.
                Nếu user.gender=FEMALE thì tránh sản phẩm targetGender=MALE. Chỉ chọn productId có trong candidates và phù hợp targetGender.
                Ưu tiên set TOP+BOTTOM+SHOES hoặc ONE_PIECE (chỉ khi hợp giới tính); có thể thêm OUTERWEAR.
                Nếu có selectedProductId, giữ sản phẩm đó khi hợp lệ.

                explanation.narrative: viết tiếng Việt, 4–5 đoạn (mỗi đoạn cách nhau bằng xuống dòng), BẮT BUỘC theo thứ tự:
                (1) Ghi nhận nhu cầu + đặc điểm khách từ JSON (occasion, số đo, gu, giới tính)
                (2) Đề xuất tự tin — nêu ĐÚNG tên sản phẩm đã chọn trong items (lấy tên từ candidates)
                (3) Giải thích VÌ SAO — liên kết form/chất liệu/màu với dáng người và hoàn cảnh (đoạn quan trọng nhất, 2–3 câu)
                (4) Mẹo mix-match phụ kiện phù hợp occasion
                (5) CTA — câu hỏi mở nhận phản hồi

                Tông: như nhân viên bán hàng thuyết phục. KHÔNG liệt kê mục "phù hợp dáng/gu/hoàn cảnh".
                Giới tính: lồng ghép tự nhiên trong đoạn "vì sao", không tách câu máy móc.

                Ví dụ ngắn (cafe, nữ): "Dạ, với nhu cầu đi cafe cuối tuần và gu trẻ trung bạn chia sẻ, em gợi ý [Áo croptop] mix [Chân váy chữ A]. Chân váy chữ A giúp đôi chân trông dài và tỉ lệ cơ thể cân đối hơn khi đi chơi. Phối thêm sneaker trắng là rất năng động. Bạn thấy set này ổn chưa, hay muốn em đổi sang form khác?"

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
