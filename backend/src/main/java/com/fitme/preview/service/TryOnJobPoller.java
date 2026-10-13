package com.fitme.preview.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Background safety net for async VTON jobs (the status endpoint also polls on demand).
 * Skips the database scan while no job can be in flight, so an idle always-on backend
 * does not keep a scale-to-zero database (Neon) awake with a query every few seconds.
 */
@Component
@RequiredArgsConstructor
public class TryOnJobPoller {

    static final Duration DISPATCH_GRACE = Duration.ofMinutes(2);

    private final VtonTryOnService vtonTryOnService;

    /** Starts true so jobs left PROCESSING by a previous instance are picked up after a restart. */
    private boolean jobsMayBePending = true;

    @Scheduled(fixedDelayString = "${fitme.ai.poll-interval-ms:3000}")
    public void pollJobs() {
        boolean recentDispatch = vtonTryOnService.lastAsyncDispatchAt()
                .isAfter(Instant.now().minus(DISPATCH_GRACE));
        if (!jobsMayBePending && !recentDispatch) {
            return;
        }
        jobsMayBePending = vtonTryOnService.pollProcessingJobs() > 0;
    }
}
