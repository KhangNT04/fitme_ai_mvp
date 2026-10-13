package com.fitme.ai.client;

import com.fitme.ai.client.AiVtonClient.ProviderCredits;
import com.fitme.common.config.FitMeProperties;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class AiVtonClientCreditsTest {

    private HttpServer server;

    @AfterEach
    void stopStub() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void parsesTheBalance() throws IOException {
        stub(200, "{\"provider\":\"fashn\",\"configured\":true,\"total\":234,\"subscription\":100,\"on_demand\":134}");

        ProviderCredits credits = client().fetchProviderCredits();

        assertThat(credits.isAvailable()).isTrue();
        assertThat(credits.getTotal()).isEqualTo(234);
        assertThat(credits.getSubscription()).isEqualTo(100);
        assertThat(credits.getOnDemand()).isEqualTo(134);
    }

    @Test
    void keepsTheProviderErrorFromABadGatewayBody() throws IOException {
        stub(502, "{\"provider\":\"fashn\",\"configured\":true,\"error_code\":\"UNAUTHORIZED\","
                + "\"error_message\":\"FASHN từ chối API key (401)\"}");

        ProviderCredits credits = client().fetchProviderCredits();

        assertThat(credits.isAvailable()).isFalse();
        assertThat(credits.getErrorCode()).isEqualTo("UNAUTHORIZED");
        assertThat(credits.getErrorMessage()).contains("401");
    }

    @Test
    void reportsAnOlderAiVtonWithoutTheEndpointAsUnsupported() throws IOException {
        stub(404, "{\"detail\":\"Not Found\"}");

        assertThat(client().fetchProviderCredits().getErrorCode()).isEqualTo("UNSUPPORTED");
    }

    @Test
    void reportsAnUnreachableHost() {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setVtonBaseUrl("http://127.0.0.1:1");

        ProviderCredits credits = new AiVtonClient(properties).fetchProviderCredits();

        assertThat(credits.isAvailable()).isFalse();
        assertThat(credits.getErrorCode()).isEqualTo("UNREACHABLE");
    }

    private void stub(int status, String json) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/provider/credits", exchange -> {
            byte[] body = json.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    private AiVtonClient client() {
        FitMeProperties properties = new FitMeProperties();
        properties.getAi().setVtonBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        return new AiVtonClient(properties);
    }
}
