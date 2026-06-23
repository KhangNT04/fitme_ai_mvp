package com.fitme.support;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.PostgreSQLContainer;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.concurrent.TimeUnit;

/**
 * Starts a dedicated PostgreSQL instance for integration tests when Testcontainers
 * cannot reach the local Docker daemon (common on Docker Desktop + newer API versions).
 */
public final class TestDatabaseManager {

    private static final Logger log = LoggerFactory.getLogger(TestDatabaseManager.class);

    private static final String CONTAINER_NAME = "fitme-test-postgres";
    private static final String JDBC_URL = "jdbc:postgresql://localhost:5433/fitme_test";
    private static final String USERNAME = "fitme";
    private static final String PASSWORD = "fitme123";

    private TestDatabaseManager() {
    }

    public static PostgreSQLContainer<?> tryStartContainer() {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("fitme_test")
                .withUsername(USERNAME)
                .withPassword(PASSWORD);
        container.start();
        return container;
    }

    public static void ensureFallbackDatabase() {
        if (isReachable(JDBC_URL, USERNAME, PASSWORD)) {
            return;
        }
        log.warn("Testcontainers unavailable; starting fallback PostgreSQL via Docker CLI on port 5433");
        removeExistingContainer();
        runDocker(
                "run", "-d",
                "--name", CONTAINER_NAME,
                "-e", "POSTGRES_DB=fitme_test",
                "-e", "POSTGRES_USER=" + USERNAME,
                "-e", "POSTGRES_PASSWORD=" + PASSWORD,
                "-p", "5433:5432",
                "postgres:16-alpine"
        );
        awaitDatabase(JDBC_URL, USERNAME, PASSWORD);
    }

    public static String getJdbcUrl() {
        return JDBC_URL;
    }

    public static String getUsername() {
        return USERNAME;
    }

    public static String getPassword() {
        return PASSWORD;
    }

    private static void removeExistingContainer() {
        runDocker("rm", "-f", CONTAINER_NAME);
    }

    private static void runDocker(String... command) {
        String[] full = new String[command.length + 1];
        full[0] = "docker";
        System.arraycopy(command, 0, full, 1, command.length);
        try {
            Process process = new ProcessBuilder(full)
                    .redirectErrorStream(true)
                    .start();
            boolean finished = process.waitFor(60, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("Docker command timed out: " + String.join(" ", full));
            }
            if (process.exitValue() != 0) {
                String output = readOutput(process);
                throw new IllegalStateException("Docker command failed (" + process.exitValue() + "): "
                        + String.join(" ", full) + "\n" + output);
            }
        } catch (IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to run docker: " + String.join(" ", full), ex);
        }
    }

    private static void awaitDatabase(String url, String username, String password) {
        for (int attempt = 0; attempt < 30; attempt++) {
            if (isReachable(url, username, password)) {
                return;
            }
            sleep(1000);
        }
        throw new IllegalStateException("Fallback PostgreSQL did not become ready at " + url);
    }

    private static boolean isReachable(String url, String username, String password) {
        try (Connection connection = DriverManager.getConnection(url, username, password)) {
            return connection.isValid(2);
        } catch (Exception ignored) {
            return false;
        }
    }

    private static String readOutput(Process process) throws Exception {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.lines().reduce((a, b) -> a + System.lineSeparator() + b).orElse("");
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for database", ex);
        }
    }
}
