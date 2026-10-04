package com.fitme.analytics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SiteTrafficIntegrationTest extends AbstractIntegrationTest {

    private static final String BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1";

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void visitsAreCountedPerBrowserPerDayAndReportedToAdmins() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        FitMeUserPrincipal shopper = new FitMeUserPrincipal(testDataHelper.createUser().user());
        JsonNode before = stats(admin);

        String first = UUID.randomUUID().toString();
        String second = UUID.randomUUID().toString();
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(visit(first, BROWSER)).andExpect(status().isNoContent());
        }
        mockMvc.perform(visit(second, BROWSER).with(user(shopper))).andExpect(status().isNoContent());
        // Ignored: crawlers, requests without a user agent and the admin's own browsing.
        mockMvc.perform(visit(UUID.randomUUID().toString(), "Googlebot/2.1")).andExpect(status().isNoContent());
        mockMvc.perform(visit(UUID.randomUUID().toString(), null)).andExpect(status().isNoContent());
        mockMvc.perform(visit(UUID.randomUUID().toString(), BROWSER).with(user(admin))).andExpect(status().isNoContent());
        mockMvc.perform(visit("not-a-uuid", BROWSER)).andExpect(status().isBadRequest());

        JsonNode after = stats(admin);
        assertThat(after.at("/day/visitors").asLong() - before.at("/day/visitors").asLong()).isEqualTo(2);
        assertThat(after.at("/day/pageViews").asLong() - before.at("/day/pageViews").asLong()).isEqualTo(4);
        assertThat(after.at("/day/newVisitors").asLong() - before.at("/day/newVisitors").asLong()).isEqualTo(2);
        assertThat(after.at("/week/visitors").asLong() - before.at("/week/visitors").asLong()).isEqualTo(2);
        assertThat(after.at("/month/visitors").asLong() - before.at("/month/visitors").asLong()).isEqualTo(2);
        assertThat(after.get("daily")).hasSize(30);
        assertThat(after.get("weekly")).hasSize(12);
        assertThat(after.get("monthly")).hasSize(12);
        assertThat(after.get("weekdays")).hasSize(7);
        assertThat(after.at("/daily/29/date").asText()).isEqualTo(after.get("today").asText());
        assertThat(after.at("/assessment/trend").asText()).isNotBlank();

        Integer linkedUser = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM site_visits WHERE visitor_id = ?::uuid AND user_id = ?",
                Integer.class, second, shopper.getUserId());
        assertThat(linkedUser).isEqualTo(1);
    }

    @Test
    void trafficReportIsAdminOnly() throws Exception {
        FitMeUserPrincipal shopper = new FitMeUserPrincipal(testDataHelper.createUser().user());
        mockMvc.perform(get("/api/v1/admin/traffic").with(user(shopper))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/traffic")).andExpect(status().is4xxClientError());
    }

    private JsonNode stats(FitMeUserPrincipal admin) throws Exception {
        String body = mockMvc.perform(get("/api/v1/admin/traffic").param("days", "30").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rangeDays").value(30))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("data");
    }

    private static MockHttpServletRequestBuilder visit(String visitorId, String userAgent) {
        MockHttpServletRequestBuilder request = post("/api/v1/analytics/visit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"visitorId\":\"" + visitorId + "\",\"path\":\"/products\"}");
        return userAgent == null ? request : request.header(HttpHeaders.USER_AGENT, userAgent);
    }
}
