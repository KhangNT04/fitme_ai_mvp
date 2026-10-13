package com.fitme.admin;

import com.fitme.AbstractIntegrationTest;
import com.fitme.ai.client.AiVtonClient;
import com.fitme.ai.client.AiVtonClient.ProviderCredits;
import com.fitme.admin.service.FashnCreditService;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.notification.FashnCreditAlertEmailService;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FashnCreditIntegrationTest extends AbstractIntegrationTest {

    @MockBean
    private AiVtonClient aiVtonClient;

    @MockBean
    private FashnCreditAlertEmailService alertEmail;

    @Autowired
    private FashnCreditService fashnCreditService;

    @Autowired
    private FitMeProperties properties;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private TestDataHelper testDataHelper;

    @BeforeEach
    void clearReadings() {
        jdbc.update("DELETE FROM fashn_credit_snapshots");
    }

    @Test
    void adminSeesBalanceUsageAndForecast() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        insertReading(400, Duration.ofDays(2));
        insertReading(330, Duration.ofDays(1));
        when(aiVtonClient.fetchProviderCredits()).thenReturn(balance(300, 100, 200));

        mockMvc.perform(get("/api/v1/admin/try-on/fashn-credits").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true))
                .andExpect(jsonPath("$.data.total").value(300))
                .andExpect(jsonPath("$.data.subscription").value(100))
                .andExpect(jsonPath("$.data.onDemand").value(200))
                .andExpect(jsonPath("$.data.low").value(false))
                .andExpect(jsonPath("$.data.consumed7d").value(100))
                .andExpect(jsonPath("$.data.averageDailyUsage").value(50.0))
                .andExpect(jsonPath("$.data.estimatedDaysLeft").value(6))
                .andExpect(jsonPath("$.data.topUpUrl").value(FashnCreditService.TOP_UP_URL));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM fashn_credit_snapshots", Long.class)).isEqualTo(3);
        mockMvc.perform(get("/api/v1/admin/try-on/fashn-credits").with(user(admin))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM fashn_credit_snapshots", Long.class))
                .as("readings closer than 10 minutes apart are not stored twice")
                .isEqualTo(3);
    }

    @Test
    void providerErrorsAreShownNotThrown() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        ProviderCredits notConfigured = new ProviderCredits();
        notConfigured.setConfigured(false);
        notConfigured.setErrorCode("NOT_CONFIGURED");
        notConfigured.setErrorMessage("FASHN_API_KEY chưa được cấu hình trên ai-vton");
        when(aiVtonClient.fetchProviderCredits()).thenReturn(notConfigured);

        mockMvc.perform(get("/api/v1/admin/try-on/fashn-credits").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.configured").value(false))
                .andExpect(jsonPath("$.data.available").value(false))
                .andExpect(jsonPath("$.data.errorCode").value("NOT_CONFIGURED"))
                .andExpect(jsonPath("$.data.total").isEmpty());
    }

    @Test
    void onlyAdminsCanReadTheBalance() throws Exception {
        String token = registerUserAccessToken();

        mockMvc.perform(get("/api/v1/admin/try-on/fashn-credits").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void lowBalanceEmailsAdminsAtMostOncePerDay() {
        testDataHelper.createAdmin();
        String previousMode = properties.getAi().getMode();
        properties.getAi().setMode("api");
        try {
            when(aiVtonClient.fetchProviderCredits()).thenReturn(balance(40, 0, 40));
            fashnCreditService.scheduledCheck();
            fashnCreditService.scheduledCheck();
            verify(alertEmail, times(1)).sendLowBalance(
                    argThat(emails -> !emails.isEmpty()), eq(40), eq(100), isNull(), eq(FashnCreditService.TOP_UP_URL));

            clearInvocations(alertEmail);
            when(aiVtonClient.fetchProviderCredits()).thenReturn(balance(1040, 0, 1040));
            fashnCreditService.scheduledCheck();
            verify(alertEmail, never()).sendLowBalance(anyList(), anyInt(), anyInt(), isNull(), anyString());
        } finally {
            properties.getAi().setMode(previousMode);
        }
    }

    @Test
    void scheduledCheckIsIdleWhenFashnIsNotTheActiveProvider() {
        fashnCreditService.scheduledCheck();

        verify(aiVtonClient, never()).fetchProviderCredits();
    }

    private void insertReading(int total, Duration ago) {
        jdbc.update("INSERT INTO fashn_credit_snapshots (total, checked_at) VALUES (?, ?)",
                total, Timestamp.from(Instant.now().minus(ago)));
    }

    private static ProviderCredits balance(int total, int subscription, int onDemand) {
        ProviderCredits credits = new ProviderCredits();
        credits.setProvider("fashn");
        credits.setConfigured(true);
        credits.setTotal(total);
        credits.setSubscription(subscription);
        credits.setOnDemand(onDemand);
        return credits;
    }
}
