package com.fitme.stylistchat;

import com.fitme.AbstractIntegrationTest;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class P0StylistChatIntegrationTest extends AbstractIntegrationTest {

    private static final String RATE_LIMITED = "Bạn đã gửi quá nhiều tin trong giờ. Vui lòng thử lại sau.";
    private static final String MESSAGE = "Giải giúp tôi bài toán 2 cộng 2 bằng mấy";

    /** AI-CHAT-12 */
    @Test
    void twentyFirstMessageInAnHour_isRateLimitedPerSession() throws Exception {
        String session = sessionWithBodyProfile();
        for (int i = 1; i <= 20; i++) {
            send(session).andExpect(status().isOk());
        }

        send(session)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(RATE_LIMITED));

        send(sessionWithBodyProfile()).andExpect(status().isOk());
    }

    /** SEC-ABU-01 */
    @Test
    @Disabled("KNOWN GAP: the only chat limit is 20 messages/hour per session (or user), kept in memory; a script "
            + "that opens new anonymous sessions is never throttled, so there is no per-IP or global cap on Gemini "
            + "spend. Needs a product decision on limits plus a shared limiter store.")
    void chatSpamAcrossFreshSessionsFromOneClient_isThrottled() throws Exception {
        List<Integer> statuses = new ArrayList<>();
        for (int i = 0; i < 60; i++) {
            String session = sessionWithBodyProfile();
            statuses.add(mockMvc.perform(post("/api/v1/stylist/chat/messages")
                            .with(request -> {
                                request.setRemoteAddr("203.0.113.9");
                                return request;
                            })
                            .header(SESSION_HEADER, session)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of("message", MESSAGE))))
                    .andReturn().getResponse().getStatus());
        }
        assertThat(statuses).contains(429);
    }

    private String sessionWithBodyProfile() throws Exception {
        String session = createAnonymousSessionToken();
        mockMvc.perform(post("/api/v1/me/body-profile")
                        .header(SESSION_HEADER, session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"heightCm\":165,\"weightKg\":55,\"gender\":\"FEMALE\"}"))
                .andExpect(status().isOk());
        return session;
    }

    private ResultActions send(String session) throws Exception {
        return mockMvc.perform(post("/api/v1/stylist/chat/messages")
                .header(SESSION_HEADER, session)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("message", MESSAGE))));
    }
}
