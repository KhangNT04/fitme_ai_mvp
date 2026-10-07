package com.fitme.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.common.time.AppClock;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminRetentionIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private AppClock appClock;

    private final List<UUID> seededUsers = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        appClock.reset();
        for (UUID id : seededUsers) {
            jdbc.update("DELETE FROM analytics_events WHERE user_id = ?", id);
            jdbc.update("DELETE FROM user_accounts WHERE id = ?", id);
        }
        seededUsers.clear();
    }

    @Test
    void retentionMetricsFromActivityDays() throws Exception {
        // A random Wednesday long before any other test data, so the shared database cannot leak into the windows.
        LocalDate t = LocalDate.of(2000, 1, 5).plusWeeks(ThreadLocalRandom.current().nextInt(520));
        appClock.setClock(Clock.fixed(t.atTime(10, 0).atZone(AppClock.BUSINESS_ZONE).toInstant(),
                AppClock.BUSINESS_ZONE));

        UUID heavy = consumer(t.minusDays(40), "a-heavy",
                40, 39, 33, 7, 6, 5, 4, 3, 2, 1, 0);
        UUID medium = consumer(t.minusDays(20), "b-medium", 20, 19, 13, 6, 5, 2);
        UUID light = consumer(t.minusDays(20), "e-light", 20);
        UUID returning = consumer(t.minusDays(35), "c-returning", 35, 28, 5);
        UUID lapsed = consumer(t.minusDays(50), "f-lapsed", 50, 45);
        consumer(t.minusDays(1), "g-never-active");
        UUID newcomer = consumer(t, "d-newcomer", 0);

        UUID owner = testDataHelper.createBrandOwner().user().getId();
        jdbc.update("INSERT INTO user_activity_days (user_id, activity_date) VALUES (?, ?)", owner, t);

        event(heavy, "RECOMMENDATION_GENERATED", t.minusDays(1));
        event(heavy, "RECOMMENDATION_GENERATED", t);
        event(heavy, "RECOMMENDATION_GENERATED", t.minusDays(40));
        event(heavy, "TRY_ON_STARTED", t.minusDays(2));
        event(heavy, "BUY_CLICKED", t.minusDays(2));
        event(medium, "TRY_ON_STARTED", t.minusDays(5));

        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        String json = mockMvc.perform(get("/api/v1/admin/retention").with(user(admin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode data = objectMapper.readTree(json).get("data");

        assertThat(data.get("today").asText()).isEqualTo(t.toString());
        assertThat(data.get("dau").asLong()).isEqualTo(2);
        assertThat(data.get("wau").asLong()).isEqualTo(4);
        assertThat(data.get("mau").asLong()).isEqualTo(5);
        assertThat(data.get("stickiness").asDouble()).isEqualTo(0.4);

        JsonNode d1 = data.get("retention").get(0);
        assertThat(d1.get("day").asInt()).isEqualTo(1);
        assertThat(d1.get("cohortFrom").asText()).isEqualTo(t.minusDays(31).toString());
        assertThat(d1.get("cohortTo").asText()).isEqualTo(t.minusDays(2).toString());
        assertThat(d1.get("retained").asLong()).isEqualTo(1);
        assertThat(d1.get("cohortSize").asLong()).isEqualTo(2);
        assertThat(d1.get("rate").asDouble()).isEqualTo(0.5);
        JsonNode d7 = data.get("retention").get(1);
        assertThat(d7.get("day").asInt()).isEqualTo(7);
        assertThat(d7.get("retained").asLong()).isEqualTo(2);
        assertThat(d7.get("cohortSize").asLong()).isEqualTo(3);
        assertThat(d7.get("rate").asDouble()).isEqualTo(0.667);
        JsonNode d30 = data.get("retention").get(2);
        assertThat(d30.get("retained").asLong()).isEqualTo(1);
        assertThat(d30.get("cohortSize").asLong()).isEqualTo(3);

        JsonNode cohorts = data.get("cohorts");
        assertThat(cohorts).hasSize(8);
        LocalDate thisMonday = t.minusDays(2);
        assertThat(cohorts.get(7).get("weekStart").asText()).isEqualTo(thisMonday.toString());
        assertThat(cohorts.get(0).get("weekStart").asText()).isEqualTo(thisMonday.minusWeeks(7).toString());
        JsonNode twentyDaysAgo = cohorts.get(4);
        assertThat(twentyDaysAgo.get("weekStart").asText()).isEqualTo(t.minusDays(23).toString());
        assertThat(twentyDaysAgo.get("size").asLong()).isEqualTo(2);
        assertThat(doubles(twentyDaysAgo.get("rates")))
                .containsExactly(1.0, 0.5, 0.5, 0.5, null, null, null, null);
        assertThat(doubles(cohorts.get(2).get("rates")))
                .containsExactly(1.0, 1.0, 0.0, 0.0, 1.0, 0.0, null, null);
        assertThat(cohorts.get(3).get("size").asLong()).isZero();
        assertThat(cohorts.get(3).get("activeUsers").get(4).asLong()).isZero();
        assertThat(cohorts.get(3).get("rates").get(0).isNull()).isTrue();
        assertThat(cohorts.get(7).get("size").asLong()).isEqualTo(2);
        assertThat(doubles(cohorts.get(7).get("rates")))
                .containsExactly(0.5, null, null, null, null, null, null, null);

        JsonNode frequency = data.get("frequency");
        assertThat(frequency.findValuesAsText("key")).containsExactly("1", "2-3", "4-7", "8+");
        assertThat(frequency.findValues("users").stream().map(JsonNode::asLong))
                .containsExactly(2L, 1L, 1L, 1L);

        assertThat(data.get("inactive30d").asLong()).isEqualTo(1);
        assertThat(data.get("totalConsumers").asLong()).isEqualTo(7);

        JsonNode top = data.get("topUsers");
        assertThat(top.findValuesAsText("userId")).containsExactly(
                heavy.toString(), medium.toString(), returning.toString(), newcomer.toString(), light.toString());
        assertThat(top.findValuesAsText("userId")).doesNotContain(lapsed.toString(), owner.toString());
        JsonNode first = top.get(0);
        assertThat(first.get("email").asText()).startsWith("a-heavy");
        assertThat(first.get("lastActiveDate").asText()).isEqualTo(t.toString());
        assertThat(first.get("activeDays30d").asLong()).isEqualTo(8);
        assertThat(first.get("recommendations30d").asLong()).isEqualTo(2);
        assertThat(first.get("tryOns30d").asLong()).isEqualTo(1);
        assertThat(first.get("buyClicks30d").asLong()).isEqualTo(1);
        assertThat(top.get(1).get("tryOns30d").asLong()).isEqualTo(1);
        assertThat(top.get(1).get("lastActiveDate").asText()).isEqualTo(t.minusDays(2).toString());
    }

    @Test
    void retentionIsAdminOnly() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal owner = new FitMeUserPrincipal(testDataHelper.createBrandOwner().user());
        mockMvc.perform(get("/api/v1/admin/retention").with(user(consumer)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/retention").with(user(owner)))
                .andExpect(status().isForbidden());
    }

    /** Consumer signed up at 09:00 VN on {@code signupDay}, active on today minus each of {@code daysAgo}. */
    private UUID consumer(LocalDate signupDay, String emailPrefix, int... daysAgo) {
        UUID id = testDataHelper.createUser().user().getId();
        seededUsers.add(id);
        jdbc.update("UPDATE user_accounts SET email = ?, created_at = ? WHERE id = ?",
                emailPrefix + "-" + id + "@test.fitme.ai", utc(signupDay), id);
        LocalDate today = appClock.today();
        for (int ago : daysAgo) {
            jdbc.update("INSERT INTO user_activity_days (user_id, activity_date) VALUES (?, ?)", id,
                    today.minusDays(ago));
        }
        return id;
    }

    private void event(UUID userId, String type, LocalDate day) {
        jdbc.update("INSERT INTO analytics_events (event_type, user_id, created_at) VALUES (?, ?, ?)",
                type, userId, utc(day));
    }

    private static LocalDateTime utc(LocalDate vnDay) {
        return LocalDateTime.ofInstant(vnDay.atTime(9, 0).atZone(AppClock.BUSINESS_ZONE).toInstant(), ZoneOffset.UTC);
    }

    private static List<Double> doubles(JsonNode array) {
        List<Double> values = new ArrayList<>();
        array.forEach(node -> values.add(node.isNull() ? null : node.asDouble()));
        return values;
    }
}
