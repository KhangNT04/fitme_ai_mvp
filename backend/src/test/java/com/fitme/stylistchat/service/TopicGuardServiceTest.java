package com.fitme.stylistchat.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.fitme.ai.client.GeminiStylistClient;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TopicGuardServiceTest {

    @Mock
    private GeminiStylistClient geminiStylistClient;

    @InjectMocks
    private TopicGuardService topicGuardService;

    @Test
    void acceptsFashionKeywordsWithoutGemini() {
        assertTrue(topicGuardService.isOnTopic(
                "Muốn outfit streetwear đi cafe cuối tuần", List.of()));
        verifyNoInteractions(geminiStylistClient);
    }

    @Test
    void rejectsClearOffTopicWithoutGemini() {
        assertFalse(topicGuardService.isOnTopic(
                "Viết giúp mình đoạn code Python giải phương trình", List.of()));
        verifyNoInteractions(geminiStylistClient);
    }

    @Test
    void allowsShortFollowUpAfterFashionThread() {
        assertTrue(topicGuardService.isOnTopic(
                "đổi sang màu đen đi",
                List.of("Muốn phối đồ đi làm văn phòng")));
        verifyNoInteractions(geminiStylistClient);
    }

    @Test
    void usesGeminiForAmbiguousMessages() {
        when(geminiStylistClient.classifyFashionTopic(anyString()))
                .thenReturn(Optional.of(true));
        assertTrue(topicGuardService.isOnTopic("em ơi giúp với", List.of()));
        verify(geminiStylistClient).classifyFashionTopic("em ơi giúp với");
    }

    @Test
    void rejectsAmbiguousWhenGeminiSaysNo() {
        when(geminiStylistClient.classifyFashionTopic(anyString()))
                .thenReturn(Optional.of(false));
        assertFalse(topicGuardService.isOnTopic("hello world", List.of()));
    }
}
