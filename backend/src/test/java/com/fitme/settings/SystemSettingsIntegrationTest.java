package com.fitme.settings;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.settings.service.SystemSettingsService;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SystemSettingsIntegrationTest extends AbstractIntegrationTest {

    private static final String BASE = "/api/v1/admin/settings";

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private SystemSettingsService settingsService;

    @AfterEach
    void restoreDefaults() {
        settingsService.update(SystemSettingsService.FITKEN_MAX_BALANCE, "50", null);
        settingsService.update(SystemSettingsService.TRYON_PLUS_FREE_DAILY, "3", null);
    }

    @Test
    void adminListsSeededSettingsWithVietnameseLabels() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(get(BASE).with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[?(@.key == 'fitken.max_balance')].value").value(50))
                .andExpect(jsonPath("$.data[?(@.key == 'fitken.max_balance')].label").value("Trần Fitken miễn phí"))
                .andExpect(jsonPath("$.data[?(@.key == 'fitken.max_balance')].min").value(0))
                .andExpect(jsonPath("$.data[?(@.key == 'fitken.max_balance')].max").value(100000))
                .andExpect(jsonPath("$.data[?(@.key == 'tryon.plus_free_daily')].value").value(3))
                .andExpect(jsonPath("$.data[?(@.key == 'recommendation.plus_boost')].value").value(15));
    }

    @Test
    void adminUpdatesSettingAndCacheIsInvalidated() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        assertThat(settingsService.fitkenMaxBalance()).isEqualTo(50);

        mockMvc.perform(put(BASE + "/fitken.max_balance")
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\": \"120\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.key").value("fitken.max_balance"))
                .andExpect(jsonPath("$.data.value").value(120))
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty());

        assertThat(settingsService.fitkenMaxBalance()).isEqualTo(120);
        mockMvc.perform(get(BASE).with(user(admin)))
                .andExpect(jsonPath("$.data[?(@.key == 'fitken.max_balance')].value").value(120));
    }

    @Test
    void invalidValuesAreRejectedInVietnamese() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());

        mockMvc.perform(put(BASE + "/tryon.plus_free_daily")
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\": \"101\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("SETTING_INVALID"))
                .andExpect(jsonPath("$.error").value("\"Lượt thử đồ miễn phí mỗi ngày (brand Plus)\" phải nằm trong khoảng 0 - 100"));

        mockMvc.perform(put(BASE + "/fitken.max_balance")
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\": \"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("\"Trần Fitken miễn phí\" phải là số nguyên"));

        mockMvc.perform(put(BASE + "/fitken.max_balance")
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\": \"-1\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put(BASE + "/unknown.key")
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\": \"1\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Cài đặt không tồn tại"));

        assertThat(settingsService.fitkenMaxBalance()).isEqualTo(50);
        assertThat(settingsService.getInt(SystemSettingsService.TRYON_PLUS_FREE_DAILY)).isEqualTo(3);
    }

    @Test
    void nonAdminsCannotReadOrUpdateSettings() throws Exception {
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testDataHelper.createUser().user());
        FitMeUserPrincipal brandOwner = new FitMeUserPrincipal(testDataHelper.createBrandOwner().user());

        mockMvc.perform(get(BASE).with(user(consumer))).andExpect(status().isForbidden());
        mockMvc.perform(get(BASE).with(user(brandOwner))).andExpect(status().isForbidden());
        mockMvc.perform(put(BASE + "/fitken.max_balance")
                        .with(user(consumer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\": \"999\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get(BASE)).andExpect(status().is4xxClientError());

        assertThat(settingsService.fitkenMaxBalance()).isEqualTo(50);
    }

    @Test
    void unknownKeysFallBackToCallerDefault() {
        assertThat(settingsService.getInt("does.not.exist", 7)).isEqualTo(7);
    }
}
