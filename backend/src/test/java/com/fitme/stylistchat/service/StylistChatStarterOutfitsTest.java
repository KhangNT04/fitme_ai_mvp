package com.fitme.stylistchat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.recommendation.dto.CreateRecommendationRequest;
import com.fitme.recommendation.dto.RecommendationOptionsResponse;
import com.fitme.recommendation.dto.RecommendationResponse;
import com.fitme.recommendation.service.RecommendationService;
import com.fitme.stylistchat.dto.StylistChatMessageResponse;
import com.fitme.stylistchat.repository.StylistConversationRepository;
import com.fitme.stylistchat.repository.StylistMessageRepository;
import com.fitme.userprofile.entity.BodyProfile;
import com.fitme.userprofile.entity.StyleProfile;
import com.fitme.userprofile.service.BodyProfileService;
import com.fitme.userprofile.service.StyleProfileService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StylistChatStarterOutfitsTest {

    @Mock
    private TopicGuardService topicGuardService;
    @Mock
    private ChatIntentParser chatIntentParser;
    @Mock
    private RecommendationService recommendationService;
    @Mock
    private BodyProfileService bodyProfileService;
    @Mock
    private StyleProfileService styleProfileService;
    @Mock
    private StylistConversationRepository conversationRepository;
    @Mock
    private StylistMessageRepository messageRepository;

    private StylistChatService service;

    @BeforeEach
    void setUp() {
        service = new StylistChatService(
                topicGuardService,
                chatIntentParser,
                recommendationService,
                bodyProfileService,
                styleProfileService,
                conversationRepository,
                messageRepository,
                new ObjectMapper());

        UserAccount user = UserAccount.builder()
                .email("user@fitme.ai")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();
        user.setId(UUID.randomUUID());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new FitMeUserPrincipal(user), null, List.of()));

        when(bodyProfileService.findProfileEntity()).thenReturn(Optional.of(new BodyProfile()));
        when(styleProfileService.findProfileEntity()).thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generateStarterOutfits_skipsFailingPresetsAndKeepsTheRest() {
        when(recommendationService.generateFromChat(any()))
                .thenReturn(chatResult())
                .thenThrow(new BusinessException("Gemini tạm thời lỗi"))
                .thenReturn(chatResult());

        StylistChatMessageResponse response = service.generateStarterOutfits();

        assertThat(response.getAssistantMessage().getType()).isEqualTo("outfit_options");
        assertThat(response.getAssistantMessage().getOptions()).hasSize(2);
        assertThat(response.getRecommendations()).hasSize(2);
    }

    @Test
    void generateStarterOutfits_allPresetsFail_returnsChatInviteInsteadOfError() {
        when(recommendationService.generateFromChat(any()))
                .thenThrow(new BusinessException("Gemini tạm thời lỗi"));

        StylistChatMessageResponse response = service.generateStarterOutfits();

        assertThat(response.getAssistantMessage().getType()).isEqualTo("text");
        assertThat(response.getAssistantMessage().getOptions()).isNull();
        assertThat(response.getRecommendations()).isEmpty();
    }

    @Test
    void generateStarterOutfits_usesStyleProfilePrimaryStyleFirst() {
        // User picked "Sporty" in the vibe quiz — the first generated preset must reflect that,
        // instead of always starting with the hardcoded "Office Chic" preset.
        when(styleProfileService.findProfileEntity()).thenReturn(Optional.of(
                StyleProfile.builder().primaryStyle("Sporty").build()));
        when(recommendationService.generateFromChat(any())).thenReturn(chatResult());

        service.generateStarterOutfits();

        ArgumentCaptor<CreateRecommendationRequest> captor =
                ArgumentCaptor.forClass(CreateRecommendationRequest.class);
        Mockito.verify(recommendationService, Mockito.atLeastOnce()).generateFromChat(captor.capture());
        assertThat(captor.getAllValues().get(0).getStyleLabels()).containsExactly("Sporty");
        assertThat(captor.getAllValues().get(0).getOccasion()).isEqualTo("Tập gym");
    }

    @Test
    void generateStarterOutfits_emptyGenerationResult_isSkipped() {
        when(recommendationService.generateFromChat(any())).thenReturn(
                new RecommendationService.ChatGenerationResult(
                        RecommendationOptionsResponse.builder()
                                .requestId(UUID.randomUUID())
                                .options(List.of())
                                .build(),
                        List.of()));

        StylistChatMessageResponse response = service.generateStarterOutfits();

        assertThat(response.getAssistantMessage().getType()).isEqualTo("text");
        assertThat(response.getRecommendations()).isEmpty();
    }

    private static RecommendationService.ChatGenerationResult chatResult() {
        UUID recommendationId = UUID.randomUUID();
        RecommendationResponse recommendation = RecommendationResponse.builder()
                .recommendationId(recommendationId)
                .title("Outfit phong cách Minimal")
                .outfitItems(List.of(RecommendationResponse.OutfitItemDto.builder()
                        .displayName("Áo thun trắng")
                        .build()))
                .build();
        RecommendationOptionsResponse options = RecommendationOptionsResponse.builder()
                .requestId(UUID.randomUUID())
                .options(List.of(RecommendationOptionsResponse.StyleOptionDto.builder()
                        .recommendationId(recommendationId)
                        .styleLabel("Minimal")
                        .title("Outfit phong cách Minimal")
                        .itemCount(1)
                        .stylistSource("rule")
                        .build()))
                .build();
        return new RecommendationService.ChatGenerationResult(options, List.of(recommendation));
    }
}
