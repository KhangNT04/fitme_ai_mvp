package com.fitme.admin.service;

import com.fitme.admin.dto.FashnCreditStatusDto;
import com.fitme.ai.client.AiVtonClient;
import com.fitme.ai.client.AiVtonClient.ProviderCredits;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.time.AppClock;
import com.fitme.notification.FashnCreditAlertEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/** Reads the FASHN API balance through ai-vton, keeps a reading history and warns admins before it runs out. */
@Service
@RequiredArgsConstructor
@Slf4j
public class FashnCreditService {

    public static final String TOP_UP_URL = "https://app.fashn.ai/billing/api";

    private static final Duration MIN_SNAPSHOT_INTERVAL = Duration.ofMinutes(10);
    private static final Duration SNAPSHOT_RETENTION = Duration.ofDays(90);
    private static final Duration ALERT_INTERVAL = Duration.ofHours(24);
    private static final Duration MIN_FORECAST_HISTORY = Duration.ofDays(1);

    private final AiVtonClient aiVtonClient;
    private final FitMeProperties properties;
    private final JdbcTemplate jdbc;
    private final AppClock clock;
    private final FashnCreditAlertEmailService alertEmail;

    private final AtomicReference<Instant> lastLowAlertAt = new AtomicReference<>();

    public FashnCreditStatusDto status() {
        Instant now = clock.now();
        ProviderCredits credits = aiVtonClient.fetchProviderCredits();
        if (credits.isAvailable()) {
            recordSnapshot(credits, now);
        }
        return buildStatus(credits, now);
    }

    /** Hourly reading so usage history exists even when nobody opens the admin page. */
    @Scheduled(cron = "0 7 * * * *", zone = "Asia/Ho_Chi_Minh")
    public void scheduledCheck() {
        if (!"api".equalsIgnoreCase(properties.getAi().getMode())) {
            return;
        }
        Instant now = clock.now();
        ProviderCredits credits = aiVtonClient.fetchProviderCredits();
        if (!credits.isAvailable()) {
            log.warn("FASHN credit check failed: {} {}", credits.getErrorCode(), credits.getErrorMessage());
            return;
        }
        recordSnapshot(credits, now);
        jdbc.update("DELETE FROM fashn_credit_snapshots WHERE checked_at < ?",
                Timestamp.from(now.minus(SNAPSHOT_RETENTION)));
        alertIfLow(buildStatus(credits, now), now);
    }

    void alertIfLow(FashnCreditStatusDto status, Instant now) {
        if (!status.low()) {
            lastLowAlertAt.set(null);
            return;
        }
        Instant last = lastLowAlertAt.get();
        if (last != null && Duration.between(last, now).compareTo(ALERT_INTERVAL) < 0) {
            return;
        }
        if (!lastLowAlertAt.compareAndSet(last, now)) {
            return;
        }
        List<String> admins = jdbc.queryForList(
                "SELECT email FROM user_accounts WHERE role = 'ADMIN' AND status = 'ACTIVE'", String.class);
        int delivered = alertEmail.sendLowBalance(
                admins, status.total(), status.lowThreshold(), status.estimatedDaysLeft(), TOP_UP_URL);
        log.warn("FASHN credits low ({} < {}): alert emailed to {}/{} admins",
                status.total(), status.lowThreshold(), delivered, admins.size());
    }

    private void recordSnapshot(ProviderCredits credits, Instant now) {
        Timestamp latest = jdbc.query("SELECT MAX(checked_at) FROM fashn_credit_snapshots",
                rs -> rs.next() ? rs.getTimestamp(1) : null);
        if (latest != null && Duration.between(latest.toInstant(), now).compareTo(MIN_SNAPSHOT_INTERVAL) < 0) {
            return;
        }
        jdbc.update("INSERT INTO fashn_credit_snapshots (total, subscription, on_demand, checked_at) VALUES (?, ?, ?, ?)",
                credits.getTotal(),
                credits.getSubscription() == null ? 0 : credits.getSubscription(),
                credits.getOnDemand() == null ? 0 : credits.getOnDemand(),
                Timestamp.from(now));
    }

    private FashnCreditStatusDto buildStatus(ProviderCredits credits, Instant now) {
        Instant since30d = now.minus(Duration.ofDays(30));
        Instant since7d = now.minus(Duration.ofDays(7));
        List<Reading> readings = jdbc.query(
                "SELECT total, checked_at FROM fashn_credit_snapshots WHERE checked_at >= ? ORDER BY checked_at",
                (rs, i) -> new Reading(rs.getInt("total"), rs.getTimestamp("checked_at").toInstant()),
                Timestamp.from(since30d));

        int consumed7d = consumedSince(readings, since7d);
        int consumed30d = consumedSince(readings, since30d);
        Instant trackedSince = readings.isEmpty() ? null : readings.get(0).at();
        Double averageDaily = averageDailyUsage(readings, since7d, now);
        Integer daysLeft = null;
        if (credits.isAvailable() && averageDaily != null && averageDaily > 0) {
            daysLeft = (int) Math.floor(credits.getTotal() / averageDaily);
        }

        int threshold = Math.max(0, properties.getAi().getFashnLowCreditThreshold());
        boolean low = credits.isAvailable() && threshold > 0 && credits.getTotal() < threshold;
        return new FashnCreditStatusDto(
                properties.getAi().getMode(),
                credits.isConfigured(),
                credits.isAvailable(),
                credits.getTotal(),
                credits.getSubscription(),
                credits.getOnDemand(),
                credits.getErrorCode(),
                credits.getErrorMessage(),
                threshold,
                low,
                consumed7d,
                consumed30d,
                averageDaily,
                daysLeft,
                trackedSince,
                countAiTryOns(since7d),
                countAiTryOns(since30d),
                now,
                TOP_UP_URL);
    }

    private long countAiTryOns(Instant since) {
        Long count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM preview_generations
                WHERE preview_source = 'VTON' AND status = 'SUCCEEDED' AND created_at >= ?
                """, Long.class, Timestamp.from(since));
        return count == null ? 0 : count;
    }

    record Reading(int total, Instant at) {
    }

    /** Sum of balance drops between consecutive readings taken since {@code since}; rises are top-ups. */
    static int consumedSince(List<Reading> readings, Instant since) {
        int consumed = 0;
        Reading previous = null;
        for (Reading reading : readings) {
            if (reading.at().isBefore(since)) {
                continue;
            }
            if (previous != null && reading.total() < previous.total()) {
                consumed += previous.total() - reading.total();
            }
            previous = reading;
        }
        return consumed;
    }

    /** Credits per day over the last week, or {@code null} until at least a day of readings exists. */
    static Double averageDailyUsage(List<Reading> readings, Instant since, Instant now) {
        Instant first = readings.stream().map(Reading::at).filter(at -> !at.isBefore(since)).findFirst().orElse(null);
        if (first == null) {
            return null;
        }
        Duration span = Duration.between(first, now);
        if (span.compareTo(MIN_FORECAST_HISTORY) < 0) {
            return null;
        }
        double days = span.toMinutes() / (24.0 * 60.0);
        return Math.round(consumedSince(readings, since) / days * 10.0) / 10.0;
    }
}
