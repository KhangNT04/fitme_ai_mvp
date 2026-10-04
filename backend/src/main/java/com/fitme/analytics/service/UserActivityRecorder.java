package com.fitme.analytics.service;

import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Marks a user as active for the current business day; at most one write per user per day per instance. */
@Component
@RequiredArgsConstructor
public class UserActivityRecorder {

    private static final Logger log = LoggerFactory.getLogger(UserActivityRecorder.class);

    private final JdbcTemplate jdbcTemplate;
    private final AppClock clock;
    private final Map<UUID, LocalDate> lastRecorded = new ConcurrentHashMap<>();

    public void recordActive(UUID userId) {
        if (userId == null) {
            return;
        }
        LocalDate today = clock.today();
        if (today.equals(lastRecorded.get(userId))) {
            return;
        }
        try {
            jdbcTemplate.update(
                    "INSERT INTO user_activity_days (user_id, activity_date) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    userId, today);
            lastRecorded.put(userId, today);
        } catch (DataAccessException ex) {
            log.debug("Could not record activity for {}: {}", userId, ex.getMessage());
        }
    }
}
