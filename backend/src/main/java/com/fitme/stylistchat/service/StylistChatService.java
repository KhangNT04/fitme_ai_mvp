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
import com.fitme.userprofile.service.BodyProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StylistChatService {

    private static final int MAX_HISTORY = 10;
    private static final int RATE_LIMIT_PER_HOUR = 20;
    private static final String OFF_TOPIC_TYPE = "off_topic";
    private static final String OUTFIT_OPTIONS_TYPE = "outfit_options";

    private final TopicGuardService topicGuardService;
    private final ChatIntentParser chatIntentParser;
    private final RecommendationService recommendationService;
    private final BodyProfileService bodyProfileService;
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
        List<RecommendationResponse> recommendations = result.recommendations();

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
}
