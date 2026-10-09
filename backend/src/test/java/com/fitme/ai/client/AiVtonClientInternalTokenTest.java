package com.fitme.ai.client;

import com.fitme.common.config.FitMeProperties;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;

class AiVtonClientInternalTokenTest {

    private HttpServer server;
    private final List<String> receivedTokens = new CopyOnWriteArrayList<>();

    @BeforeEach
    void startStub() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/try-on", exchange -> {
            String token = exchange.getRequestHeaders().getFirst(AiVtonClient.INTERNAL_TOKEN_HEADER);
            receivedTokens.add(token == null ? "<none>" : token);
            exchange.getRequestBody().readAllBytes();
            byte[] body = "{\"job_id\":\"job-1\",\"status\":\"processing\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(exchange.getRequestMethod().equals("POST") ? 202 : 200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stopStub() {
        server.stop(0);
    }

    @Test
    void sendsTheSharedSecretOnSubmitAndPollWhenConfigured() {
        AiVtonClient client = new AiVtonClient(properties("shared-secret"));

        client.submitJob("https://cdn.test/person.jpg", "https://cdn.test/shirt.jpg", "tops", null);
        client.pollJob("job-1");

        assertThat(receivedTokens).containsExactly("shared-secret", "shared-secret");
    }

    @Test
    void sendsNoTokenHeaderWhenUnset() {
        AiVtonClient client = new AiVtonClient(properties(" "));

        client.submitJob("https://cdn.test/person.jpg", "https://cdn.test/shirt.jpg", "tops", null);

        assertThat(receivedTokens).containsExactly("<none>");
    }

    private FitMeProperties properties(String token) {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setMode("api");
        properties.getAi().setVtonBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.getAi().setVtonInternalToken(token);
        properties.getAi().setVtonWakeRetrySeconds(0);
        return properties;
    }
}
