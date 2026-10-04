package com.fitme.common.time;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Injectable clock for business-day logic (check-in streaks, share limits, subscription expiry).
 * Calendar days are evaluated in Asia/Ho_Chi_Minh; tests may pin the clock via {@link #setClock}.
 */
@Component
public class AppClock {

    public static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private volatile Clock clock = Clock.system(BUSINESS_ZONE);

    public Instant now() {
        return clock.instant();
    }

    public LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), BUSINESS_ZONE);
    }

    public Instant startOfDay(LocalDate date) {
        return date.atStartOfDay(BUSINESS_ZONE).toInstant();
    }

    public void setClock(Clock clock) {
        this.clock = clock != null ? clock : Clock.system(BUSINESS_ZONE);
    }

    public void reset() {
        setClock(null);
    }
}
