package com.fitme.admin.service;

import com.fitme.admin.service.FashnCreditService.Reading;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FashnCreditUsageTest {

    private static final Instant NOW = Instant.parse("2026-10-14T00:00:00Z");

    @Test
    void topUpsAreNotCountedAsNegativeUsage() {
        List<Reading> readings = List.of(
                reading(500, 3),
                reading(420, 2),
                reading(1420, 1),
                reading(1300, 0));

        assertThat(FashnCreditService.consumedSince(readings, NOW.minus(Duration.ofDays(7)))).isEqualTo(200);
    }

    @Test
    void onlyReadingsInsideTheWindowCount() {
        List<Reading> readings = List.of(reading(900, 10), reading(800, 5), reading(700, 0));

        assertThat(FashnCreditService.consumedSince(readings, NOW.minus(Duration.ofDays(7)))).isEqualTo(100);
        assertThat(FashnCreditService.consumedSince(readings, NOW.minus(Duration.ofDays(30)))).isEqualTo(200);
    }

    @Test
    void averageNeedsAtLeastADayOfHistory() {
        Instant since = NOW.minus(Duration.ofDays(7));

        assertThat(FashnCreditService.averageDailyUsage(List.of(), since, NOW)).isNull();
        assertThat(FashnCreditService.averageDailyUsage(
                List.of(new Reading(100, NOW.minus(Duration.ofHours(5))), new Reading(90, NOW)), since, NOW))
                .isNull();
        assertThat(FashnCreditService.averageDailyUsage(
                List.of(reading(300, 2), reading(240, 1), reading(200, 0)), since, NOW))
                .isEqualTo(50.0);
    }

    private static Reading reading(int total, int daysAgo) {
        return new Reading(total, NOW.minus(Duration.ofDays(daysAgo)));
    }
}
