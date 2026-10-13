package com.fitme.preview.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TryOnJobPollerTest {

    @Mock
    private VtonTryOnService vtonTryOnService;

    @InjectMocks
    private TryOnJobPoller poller;

    @Test
    void scansOnStartupThenStopsOnceNothingIsProcessing() {
        when(vtonTryOnService.lastAsyncDispatchAt()).thenReturn(Instant.EPOCH);
        when(vtonTryOnService.pollProcessingJobs()).thenReturn(0);

        poller.pollJobs();
        poller.pollJobs();
        poller.pollJobs();

        verify(vtonTryOnService, times(1)).pollProcessingJobs();
    }

    @Test
    void keepsScanningWhileJobsAreProcessing() {
        when(vtonTryOnService.lastAsyncDispatchAt()).thenReturn(Instant.EPOCH);
        when(vtonTryOnService.pollProcessingJobs()).thenReturn(2, 1, 0);

        poller.pollJobs();
        poller.pollJobs();
        poller.pollJobs();
        poller.pollJobs();

        verify(vtonTryOnService, times(3)).pollProcessingJobs();
    }

    @Test
    void resumesScanningAfterANewDispatch() {
        when(vtonTryOnService.lastAsyncDispatchAt()).thenReturn(Instant.EPOCH);
        when(vtonTryOnService.pollProcessingJobs()).thenReturn(0);
        poller.pollJobs();
        poller.pollJobs();

        when(vtonTryOnService.lastAsyncDispatchAt()).thenReturn(Instant.now());
        poller.pollJobs();

        verify(vtonTryOnService, times(2)).pollProcessingJobs();
    }
}
