package com.fitme.notification;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.service.AuthEmailService;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.common.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CustomerEmailIntegrationTest extends AbstractIntegrationTest {

    @SpyBean
    private AuthEmailService mail;

    @Autowired
    private BillingPlanRepository planRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private JwtService jwtService;

    @Test
    void proCheckout_sendsPlanPurchasedEmail() throws Exception {
        String token = registerUserAccessToken();
        UUID planId = planRepository.findByCode(ConsumerSubscriptionService.PRO_PLAN_CODE).orElseThrow().getId();

        mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"" + planId + "\"}"))
                .andExpect(status().isOk());

        verify(mail, timeout(5000)).sendNotification(eq(email(token)), contains("Pro"), contains("Hiệu lực Pro đến"),
                anyString(), eq("plan purchased"));
    }

    private String email(String token) {
        return jdbc.queryForObject("SELECT email FROM user_accounts WHERE id=?", String.class,
                jwtService.getUserId(token));
    }
}
