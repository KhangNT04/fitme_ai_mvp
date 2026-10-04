package com.fitme.ai.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.ai.dto.GeminiOutfitSuggestion;
import com.fitme.common.config.FitMeProperties;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

class GeminiStylistClientTest {

    private static final String SUGGESTION_RESPONSE = """
            {"candidates":[{"content":{"parts":[{"text":"{\\"title\\":\\"Set tối giản\\",\\"items\\":[]}"}]}}]}
            """;

    @Test
    void suggestOutfit_fallsBackWhenPrimaryModelIsOverloadedAndSkipsItDuringCooldown() throws Exception {
        List<String> modelsCalled = new CopyOnWriteArrayList<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1beta/models/", exchange -> {
            String path = exchange.getRequestURI().getPath();
            String model = path.substring(path.lastIndexOf('/') + 1, path.indexOf(':'));
            modelsCalled.add(model);
            boolean overloaded = model.equals("primary-model");
            byte[] body = (overloaded ? "{\"error\":{\"code\":503,\"status\":\"UNAVAILABLE\"}}" : SUGGESTION_RESPONSE)
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(overloaded ? 503 : 200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            GeminiStylistClient client = new GeminiStylistClient(properties(), new ObjectMapper());
            client.setBaseUrlForTest("http://127.0.0.1:" + server.getAddress().getPort());

            Optional<GeminiOutfitSuggestion> first = client.suggestOutfit("{}");
            Optional<GeminiOutfitSuggestion> second = client.suggestOutfit("{}");

            assertThat(first).map(GeminiOutfitSuggestion::getTitle).contains("Set tối giản");
            assertThat(second).isPresent();
            assertThat(modelsCalled).containsExactly("primary-model", "fallback-model", "fallback-model");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void isOverloaded_onlyFor503And429() {
        assertThat(GeminiStylistClient.isOverloaded(503)).isTrue();
        assertThat(GeminiStylistClient.isOverloaded(429)).isTrue();
        assertThat(GeminiStylistClient.isOverloaded(400)).isFalse();
        assertThat(GeminiStylistClient.isOverloaded(404)).isFalse();
    }

    private static FitMeProperties properties() {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setStylistMode("gemini");
        properties.getAi().setGeminiApiKey("test-key");
        properties.getAi().setGeminiModel("primary-model");
        properties.getAi().setGeminiFallbackModel("fallback-model");
        properties.getAi().setStylistTimeoutMs(5000);
        return properties;
    }
}
