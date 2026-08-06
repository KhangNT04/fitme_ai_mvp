package com.fitme.stylistchat.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.common.enums.WardrobeMode;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.dto.RecommendationOptionsResponse;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.service.RecommendationService;
import com.fitme.stylistchat.dto.StylistChatMessageRequest;
import com.fitme.stylistchat.dto.StylistChatMessageResponse;
import com.fitme.stylistchat.dto.StylistConversationDto;
import com.fitme.stylistchat.entity.StylistConversation;
import com.fitme.stylistchat.entity.StylistMessage;
import com.fitme.stylistchat.repository.StylistConversationRepository;
import com.fitme.stylistchat.repository.StylistMessageRepository;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.service.BodyProfileService;
import com.fitme.userprofile.service.StyleProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StylistChatService {

    private static final int MAX_HISTORY = 10;
    private static final int RATE_LIMIT_PER_HOUR = 20;
    private static final String OFF_TOPIC_TYPE = "off_topic";
    private static final String OUTFIT_OPTIONS_TYPE = "outfit_options";
    private static final String STARTER_UNAVAILABLE_REPLY =
            "Mình chưa phối được set gợi ý mở đầu ngay lúc này. Bạn nhắn dịp mặc hoặc phong cách mong muốn, "
                    + "mình sẽ phối ngay nhé.";
    private static final String OCCASION_CASUAL_DAILY = "Casual hàng ngày";
    /** Default catalog used when the user has no saved StyleProfile yet — also the fill order
     * used to top up personalized presets to 3 when the profile only has 1-2 styles. */
    private static final List<StarterOutfitPreset> STARTER_OUTFITS = List.of(
            new StarterOutfitPreset("Đi làm", "Đi làm", "Thanh lịch, gọn gàng", "Office Chic"),
            new StarterOutfitPreset("Đi chơi", "Đi chơi", "Thoải mái, có điểm nhấn", "Streetwear"),
            new StarterOutfitPreset("Thể thao", "Tập gym", "Năng động, thoải mái", "Sporty")
    );

    /** Occasion + vibe copy for styles a user may have picked via the style profile editor
     * (beyond the 3 vibe-quiz presets above). Keeps starter outfits sensible for any StyleProfile. */
    private static final Map<String, StarterOutfitPreset> STYLE_PRESET_DEFAULTS = Map.of(
            "Office Chic", new StarterOutfitPreset("Đi làm", "Đi làm", "Thanh lịch, gọn gàng", "Office Chic"),
            "Streetwear", new StarterOutfitPreset("Đi chơi", "Đi chơi", "Thoải mái, có điểm nhấn", "Streetwear"),
            "Sporty", new StarterOutfitPreset("Thể thao", "Tập gym", "Năng động, thoải mái", "Sporty"),
            "Minimal", new StarterOutfitPreset("Tối giản", OCCASION_CASUAL_DAILY, "Tối giản, tinh gọn", "Minimal"),
            "Korean Casual", new StarterOutfitPreset("Hàn nhẹ", "Đi chơi", "Nhẹ nhàng, trẻ trung kiểu Hàn", "Korean Casual"),
            "Romantic", new StarterOutfitPreset("Hẹn hò", "Hẹn hò", "Nữ tính, lãng mạn", "Romantic"),
            "Vintage", new StarterOutfitPreset("Vintage", "Đi chơi", "Hoài cổ, có cá tính", "Vintage"),
            "Artistic", new StarterOutfitPreset("Nghệ", "Đi chơi", "Cá tính, sáng tạo", "Artistic")
    );

    private final TopicGuardService topicGuardService;
    private final ChatIntentParser chatIntentParser;
    private final RecommendationService recommendationService;
    private final BodyProfileService bodyProfileService;
    private final StyleProfileService styleProfileService;
    private final StylistConversationRepository conversationRepository;
    private final StylistMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, RateWindow> rateWindows = new ConcurrentHashMap<>();

    @Transactional
    public StylistChatMessageResponse sendMessage(StylistChatMessageRequest request) {
        if (request.getMessage() == null || request.getMessage().isBlank()) {
            throw new BusinessException("Vui lòng nhập tin nhắn");
        }
        String message = request.getMessage().trim();
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId == null && sessionId == null) {
            throw new BusinessException("Yêu cầu đăng nhập hoặc session ẩn danh");
        }

        enforceRateLimit(userId, sessionId);

        BodyProfile body = bodyProfileService.findProfileEntity()
                .orElseThrow(() -> new BusinessException("Vui lòng cập nhật body profile trước"));

        List<String> recentUserMessages = extractRecentUserMessages(request, userId);
        boolean onTopic = topicGuardService.isOnTopic(message, recentUserMessages);

        StylistConversation conversation = null;
        if (userId != null) {
            conversation = resolveOrCreateConversation(userId, request.getConversationId(), message);
            saveMessage(conversation.getId(), "user", "text", message, null);
        }

        if (!onTopic) {
            if (conversation != null) {
                saveMessage(conversation.getId(), "assistant", OFF_TOPIC_TYPE, TopicGuardService.OFF_TOPIC_REPLY, null);
                touchConversation(conversation);
            }
            return StylistChatMessageResponse.builder()
                    .conversationId(conversation != null ? conversation.getId() : null)
                    .assistantMessage(StylistChatMessageResponse.AssistantMessageDto.builder()
                            .type(OFF_TOPIC_TYPE)
                            .content(TopicGuardService.OFF_TOPIC_REPLY)
                            .build())
                    .build();
        }

        ChatIntentParser.ChatIntent intent = chatIntentParser.parse(message, body);
        CreateRecommendationRequest genRequest = new CreateRecommendationRequest();
        genRequest.setSessionId(sessionId);
        genRequest.setSelectedProductId(request.getSelectedProductId());
        genRequest.setOccasion(intent.occasion());
        genRequest.setDesiredVibe(intent.desiredVibe());
        genRequest.setWardrobeMode(request.getWardrobeMode() != null
                ? request.getWardrobeMode()
                : WardrobeMode.NO_WARDROBE_DATA);
        genRequest.setUserMessage(message);
        genRequest.setStyleLabels(intent.styleLabels());
        genRequest.setConversationHistory(buildHistoryLines(request, recentUserMessages));
        if (conversation != null) {
            genRequest.setConversationId(conversation.getId());
        }

        RecommendationService.ChatGenerationResult result = recommendationService.generateFromChat(genRequest);
        RecommendationOptionsResponse options = result.options();
        List<RecommendationResponse> recommendations = result.recommendations() == null
                ? List.of()
                : result.recommendations().stream()
                .filter(rec -> rec.getOutfitItems() != null && !rec.getOutfitItems().isEmpty())
                .toList();

        applyOccasionDisplayLabels(intent, options, recommendations);

        if (recommendations.isEmpty()) {
            String emptyReply = "Mình chưa ghép được set sản phẩm phù hợp ngay lúc này. "
                    + "Bạn thử mô tả cụ thể hơn (vd: áo sơ mi đi làm, đi cafe tối giản) nhé.";
            if (conversation != null) {
                saveMessage(conversation.getId(), "assistant", "text", emptyReply, null);
                touchConversation(conversation);
            }
            return StylistChatMessageResponse.builder()
                    .conversationId(conversation != null ? conversation.getId() : null)
                    .requestId(options.getRequestId())
                    .assistantMessage(StylistChatMessageResponse.AssistantMessageDto.builder()
                            .type("text")
                            .content(emptyReply)
                            .build())
                    .recommendations(List.of())
                    .build();
        }

        // Keep options aligned with non-empty recommendations only.
        if (options.getOptions() != null) {
            java.util.Set<UUID> keptIds = recommendations.stream()
                    .map(RecommendationResponse::getRecommendationId)
                    .collect(Collectors.toSet());
            options.setOptions(options.getOptions().stream()
                    .filter(opt -> keptIds.contains(opt.getRecommendationId()))
                    .toList());
        }

        String assistantContent = buildOutfitIntro(intent, options);
        String contentForStore = assistantContent;
        try {
            contentForStore = objectMapper.writeValueAsString(Map.of(
                    "text", assistantContent,
                    "options", options.getOptions() != null ? options.getOptions() : List.of(),
                    "requestId", options.getRequestId() != null ? options.getRequestId().toString() : ""
            ));
        } catch (JsonProcessingException ignored) {
            // fall back to plain text
        }

        if (conversation != null) {
            saveMessage(conversation.getId(), "assistant", OUTFIT_OPTIONS_TYPE, contentForStore, options.getRequestId());
            touchConversation(conversation);
        }

        return StylistChatMessageResponse.builder()
                .conversationId(conversation != null ? conversation.getId() : null)
                .requestId(options.getRequestId())
                .assistantMessage(StylistChatMessageResponse.AssistantMessageDto.builder()
                        .type(OUTFIT_OPTIONS_TYPE)
                        .content(assistantContent)
                        .options(options.getOptions())
                        .build())
                .recommendations(recommendations)
                .build();
    }

    /**
     * Generates one concise, profile-aware outfit for each common daily context.
     * This is used once immediately after a body profile is completed.
     *
     * <p>Each preset runs in its own transaction so one failing style (Gemini outage,
     * thin catalog) still leaves the other boards usable.
     */
    public StylistChatMessageResponse generateStarterOutfits() {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId == null && sessionId == null) {
            throw new BusinessException("Yêu cầu đăng nhập hoặc session ẩn danh");
        }

        enforceRateLimit(userId, sessionId);
        bodyProfileService.findProfileEntity()
                .orElseThrow(() -> new BusinessException("Vui lòng cập nhật body profile trước"));

        List<RecommendationOptionsResponse.StyleOptionDto> options = new ArrayList<>();
        List<RecommendationResponse> recommendations = new ArrayList<>();
        UUID firstRequestId = null;

        for (StarterOutfitPreset preset : resolveStarterPresets()) {
            CreateRecommendationRequest generationRequest = new CreateRecommendationRequest();
            generationRequest.setSessionId(sessionId);
            generationRequest.setOccasion(preset.occasion());
            generationRequest.setDesiredVibe(preset.vibe());
            generationRequest.setWardrobeMode(WardrobeMode.NO_WARDROBE_DATA);
            generationRequest.setUserMessage(
                    "Gợi ý outfit " + preset.label().toLowerCase() + " phù hợp hồ sơ của tôi");
            generationRequest.setStyleLabels(List.of(preset.style()));
            generationRequest.setSingleStyle(true);

            RecommendationService.ChatGenerationResult result;
            try {
                result = recommendationService.generateFromChat(generationRequest);
            } catch (RuntimeException ex) {
                log.warn("Starter outfit generation failed for preset={}: {}", preset.label(), ex.getMessage());
                continue;
            }
            if (result.recommendations().isEmpty()
                    || result.options().getOptions() == null
                    || result.options().getOptions().isEmpty()) {
                log.warn("Starter outfit generation returned no outfit for preset={}", preset.label());
                continue;
            }
            RecommendationResponse recommendation = result.recommendations().getFirst();
            if (recommendation.getOutfitItems() == null || recommendation.getOutfitItems().isEmpty()) {
                log.warn("Starter outfit generation returned empty items for preset={}", preset.label());
                continue;
            }
            RecommendationOptionsResponse.StyleOptionDto generatedOption =
                    result.options().getOptions().getFirst();

            if (firstRequestId == null) {
                firstRequestId = result.options().getRequestId();
            }
            recommendations.add(recommendation);
            String occasionTitle = "Outfit " + preset.label().toLowerCase();
            if (recommendation.getTitle() == null || recommendation.getTitle().isBlank()
                    || recommendation.getTitle().startsWith("Outfit phong cách")
                    || recommendation.getTitle().contains(" · ")) {
                recommendation.setTitle(occasionTitle);
            }
            options.add(RecommendationOptionsResponse.StyleOptionDto.builder()
                    .recommendationId(recommendation.getRecommendationId())
                    .styleLabel(preset.label())
                    .title(recommendation.getTitle())
                    .previewImageUrl(generatedOption.getPreviewImageUrl())
                    .itemCount(generatedOption.getItemCount())
                    .stylistSource(generatedOption.getStylistSource())
                    .build());
        }

        if (options.isEmpty()) {
            return StylistChatMessageResponse.builder()
                    .assistantMessage(StylistChatMessageResponse.AssistantMessageDto.builder()
                            .type("text")
                            .content(STARTER_UNAVAILABLE_REPLY)
                            .build())
                    .recommendations(List.of())
                    .build();
        }

        return StylistChatMessageResponse.builder()
                .requestId(firstRequestId)
                .assistantMessage(StylistChatMessageResponse.AssistantMessageDto.builder()
                        .type(OUTFIT_OPTIONS_TYPE)
                        .content(buildStarterIntro(options))
                        .options(options)
                        .build())
                .recommendations(recommendations)
                .build();
    }

    /**
     * Personalizes the starter outfit boards from the user's saved {@link StyleProfile}
     * (primary style picked in the vibe quiz / style editor, then secondary styles), instead of
     * always generating the same 3 hardcoded presets regardless of what the user told us they like.
     * Falls back to the default catalog when no profile is saved yet (e.g. skipped the quiz).
     */
    private List<StarterOutfitPreset> resolveStarterPresets() {
        Optional<StyleProfile> profile = styleProfileService.findProfileEntity();
        if (profile.isEmpty()) {
            return STARTER_OUTFITS;
        }

        LinkedHashSet<String> orderedStyles = new LinkedHashSet<>();
        String primaryStyle = profile.get().getPrimaryStyle();
        if (primaryStyle != null && !primaryStyle.isBlank()) {
            orderedStyles.add(primaryStyle.trim());
        }
        List<String> secondaryStyles = profile.get().getSecondaryStyles();
        if (secondaryStyles != null) {
            secondaryStyles.stream()
                    .filter(style -> style != null && !style.isBlank())
                    .map(String::trim)
                    .forEach(orderedStyles::add);
        }
        // Top up to 3 boards using the default catalog order (vibe-quiz order) so users still see
        // a few related looks even when the profile only has 1-2 styles saved.
        for (StarterOutfitPreset base : STARTER_OUTFITS) {
            if (orderedStyles.size() >= 3) {
                break;
            }
            orderedStyles.add(base.style());
        }

        if (orderedStyles.isEmpty()) {
            return STARTER_OUTFITS;
        }
        return orderedStyles.stream()
                .limit(3)
                .map(StylistChatService::toStarterPreset)
                .toList();
    }

    private static StarterOutfitPreset toStarterPreset(String style) {
        StarterOutfitPreset known = STYLE_PRESET_DEFAULTS.get(style);
        if (known != null) {
            return known;
        }
        // Unknown style saved directly via the style profile editor — fall back to a generic
        // preset but keep the display label consistent with toDisplayStyleLabel elsewhere.
        return new StarterOutfitPreset(toDisplayStyleLabel(style, null), OCCASION_CASUAL_DAILY, "Thoải mái, hợp gu", style);
    }

    public List<StylistConversationDto> listConversations() {
        UUID userId = RequestContext.getCurrentUserId()
                .orElseThrow(() -> new BusinessException("Cần đăng nhập để xem lịch sử chat"));
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(c -> StylistConversationDto.builder()
                        .id(c.getId())
                        .title(c.getTitle())
                        .updatedAt(c.getUpdatedAt())
                        .build())
                .toList();
    }

    public StylistConversationDto getConversation(UUID id) {
        UUID userId = RequestContext.getCurrentUserId()
                .orElseThrow(() -> new BusinessException("Cần đăng nhập để xem lịch sử chat"));
        StylistConversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cuộc hội thoại không tồn tại"));
        if (!userId.equals(conversation.getUserId())) {
            throw new NotFoundException("Cuộc hội thoại không tồn tại");
        }
        List<StylistConversationDto.StylistMessageDto> messages = messageRepository
                .findByConversationIdOrderByCreatedAtAsc(id).stream()
                .map(m -> StylistConversationDto.StylistMessageDto.builder()
                        .id(m.getId())
                        .role(m.getRole())
                        .type(m.getType())
                        .content(m.getContent())
                        .outfitRequestId(m.getOutfitRequestId())
                        .createdAt(m.getCreatedAt())
                        .build())
                .toList();
        return StylistConversationDto.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .updatedAt(conversation.getUpdatedAt())
                .messages(messages)
                .build();
    }

    private StylistConversation resolveOrCreateConversation(UUID userId, UUID conversationId, String firstMessage) {
        if (conversationId != null) {
            StylistConversation existing = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new NotFoundException("Cuộc hội thoại không tồn tại"));
            if (!userId.equals(existing.getUserId())) {
                throw new NotFoundException("Cuộc hội thoại không tồn tại");
            }
            return existing;
        }
        String title = firstMessage.length() > 60 ? firstMessage.substring(0, 60) + "…" : firstMessage;
        return conversationRepository.save(StylistConversation.builder()
                .userId(userId)
                .title(title)
                .build());
    }

    private void saveMessage(UUID conversationId, String role, String type, String content, UUID outfitRequestId) {
        messageRepository.save(StylistMessage.builder()
                .conversationId(conversationId)
                .role(role)
                .type(type)
                .content(content)
                .outfitRequestId(outfitRequestId)
                .build());
    }

    private void touchConversation(StylistConversation conversation) {
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
    }

    private List<String> extractRecentUserMessages(StylistChatMessageRequest request, UUID userId) {
        List<String> fromClient = new ArrayList<>();
        if (request.getHistory() != null) {
            request.getHistory().stream()
                    .filter(h -> h != null && "user".equalsIgnoreCase(h.getRole()) && h.getContent() != null)
                    .map(StylistChatMessageRequest.ChatHistoryItem::getContent)
                    .forEach(fromClient::add);
        }
        if (userId != null && request.getConversationId() != null) {
            messageRepository.findByConversationIdOrderByCreatedAtAsc(request.getConversationId()).stream()
                    .filter(m -> "user".equals(m.getRole()))
                    .map(StylistMessage::getContent)
                    .forEach(fromClient::add);
        }
        if (fromClient.size() > MAX_HISTORY) {
            return fromClient.subList(fromClient.size() - MAX_HISTORY, fromClient.size());
        }
        return fromClient;
    }

    private List<String> buildHistoryLines(StylistChatMessageRequest request, List<String> recentUser) {
        List<String> lines = new ArrayList<>();
        if (request.getHistory() != null) {
            request.getHistory().stream()
                    .filter(h -> h != null && h.getContent() != null)
                    .limit(MAX_HISTORY)
                    .forEach(h -> lines.add((h.getRole() != null ? h.getRole() : "user") + ": " + h.getContent()));
        } else {
            recentUser.forEach(m -> lines.add("user: " + m));
        }
        return lines;
    }

    private static String buildStarterIntro(List<RecommendationOptionsResponse.StyleOptionDto> options) {
        String labels = options.stream()
                .map(RecommendationOptionsResponse.StyleOptionDto::getStyleLabel)
                .map(label -> label.toLowerCase(java.util.Locale.ROOT))
                .collect(Collectors.joining(", "));
        return "Mình đã chuẩn bị " + options.size() + " style cơ bản: " + labels
                + " — phù hợp hồ sơ của bạn. Xem set bên trên rồi chat thêm nếu cần nhé.";
    }

    private static String buildOutfitIntro(
            ChatIntentParser.ChatIntent intent,
            RecommendationOptionsResponse options) {
        int count = options.getOptions() != null ? options.getOptions().size() : 0;
        String styles = options.getOptions() == null ? ""
                : options.getOptions().stream()
                .map(RecommendationOptionsResponse.StyleOptionDto::getStyleLabel)
                .collect(Collectors.joining(", "));
        return "Mình gợi ý " + count + " outfit cho bạn"
                + (styles.isBlank() ? "" : " (" + styles + ")")
                + " — chọn set nào hợp gu nhất nhé.";
    }

    /**
     * Maps catalog English style keys (Office Chic, …) to the VN occasion language
     * used on the starter StyleResultsBoard (Đi làm / Đi chơi / Thể thao).
     */
    private static void applyOccasionDisplayLabels(
            ChatIntentParser.ChatIntent intent,
            RecommendationOptionsResponse options,
            List<RecommendationResponse> recommendations) {
        if (options.getOptions() != null) {
            for (RecommendationOptionsResponse.StyleOptionDto option : options.getOptions()) {
                option.setStyleLabel(toDisplayStyleLabel(option.getStyleLabel(), intent.occasion()));
            }
        }
        for (RecommendationResponse recommendation : recommendations) {
            recommendation.setStyleLabel(
                    toDisplayStyleLabel(recommendation.getStyleLabel(), intent.occasion()));
            if (recommendation.getTitle() != null
                    && recommendation.getTitle().startsWith("Outfit phong cách ")) {
                String label = recommendation.getStyleLabel();
                if (label != null && !label.isBlank()) {
                    recommendation.setTitle("Outfit " + label.toLowerCase(java.util.Locale.ROOT));
                }
            }
        }
    }

    static String toDisplayStyleLabel(String styleLabel, String occasion) {
        if (styleLabel == null || styleLabel.isBlank()) {
            return occasion != null && !occasion.isBlank() ? occasion : styleLabel;
        }
        String normalized = styleLabel.trim();
        return switch (normalized) {
            case "Office Chic" -> occasionNotBlank(occasion) ? occasion : "Đi làm";
            case "Streetwear" -> "Đi chơi";
            case "Sporty" -> "Thể thao";
            case "Korean Casual" -> "Hàn nhẹ";
            case "Minimal" -> "Tối giản";
            case "Romantic" -> "Hẹn hò";
            case "Vintage" -> "Vintage";
            case "Artistic" -> "Nghệ";
            default -> normalized;
        };
    }

    private static boolean occasionNotBlank(String occasion) {
        return occasion != null && !occasion.isBlank()
                && !OCCASION_CASUAL_DAILY.equalsIgnoreCase(occasion);
    }

    private void enforceRateLimit(UUID userId, UUID sessionId) {
        String key = userId != null ? "u:" + userId : "s:" + sessionId;
        long now = System.currentTimeMillis();
        RateWindow window = rateWindows.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartMs > 3_600_000L) {
                return new RateWindow(now, 1);
            }
            existing.count++;
            return existing;
        });
        if (window.count > RATE_LIMIT_PER_HOUR) {
            throw new BusinessException("Bạn đã gửi quá nhiều tin trong giờ. Vui lòng thử lại sau.");
        }
    }

    private static final class RateWindow {
        final long windowStartMs;
        int count;

        RateWindow(long windowStartMs, int count) {
            this.windowStartMs = windowStartMs;
            this.count = count;
        }
    }

    private record StarterOutfitPreset(
            String label,
            String occasion,
            String vibe,
            String style) {
    }
}
