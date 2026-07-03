package com.fitme.preview.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TryOnJobPoller {

    private final VtonTryOnService vtonTryOnService;

    @Scheduled(fixedDelayString = "${fitme.ai.poll-interval-ms:3000}")
    public void pollJobs() {
        vtonTryOnService.pollProcessingJobs();
    }
}
