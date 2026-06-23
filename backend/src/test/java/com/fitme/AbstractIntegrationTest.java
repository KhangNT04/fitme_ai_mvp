package com.fitme;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.common.security.AnonymousSessionFilter;
import com.fitme.support.TestDatabaseManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
public abstract class AbstractIntegrationTest {

    /** Shared PostgreSQL container; started manually because Docker Desktop API 1.54 may require CLI fallback. */
    private static final PostgreSQLContainer<?> postgres;
    private static final boolean usingFallbackDatabase;

    static {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("fitme_test")
                .withUsername("fitme")
                .withPassword("fitme123");
        boolean fallback = false;
        try {
            container.start();
        } catch (Throwable ex) {
            fallback = true;
            TestDatabaseManager.ensureFallbackDatabase();
        }
        postgres = container;
        usingFallbackDatabase = fallback;
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        if (usingFallbackDatabase) {
            registry.add("spring.datasource.url", TestDatabaseManager::getJdbcUrl);
            registry.add("spring.datasource.username", TestDatabaseManager::getUsername);
            registry.add("spring.datasource.password", TestDatabaseManager::getPassword);
        } else {
            registry.add("spring.datasource.url", postgres::getJdbcUrl);
            registry.add("spring.datasource.username", postgres::getUsername);
            registry.add("spring.datasource.password", postgres::getPassword);
        }
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected static final String SESSION_HEADER = AnonymousSessionFilter.HEADER;

    protected String createAnonymousSessionToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/sessions/anonymous")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
        return data.get("sessionToken").asText();
    }
}
