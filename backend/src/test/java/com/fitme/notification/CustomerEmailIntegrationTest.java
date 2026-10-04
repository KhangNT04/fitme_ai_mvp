package com.fitme.notification;

import com.fitme.auth.service.AuthEmailService;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.service.ConsumerSubscriptionService;
import com.fitme.order.CommerceIntegrationSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CustomerEmailIntegrationTest extends CommerceIntegrationSupport {

    @SpyBean
    private AuthEmailService mail;

    @Autowired
    private BillingPlanRepository planRepository;

    @Test
    void codOrder_sendsConfirmationAfterCommit() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(3);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 2);

        String orderCode = placeOrder(token, addressId, "COD", null).at("/order/orderCode").asText();

        verify(mail, timeout(5000)).sendNotification(eq(email(token)), contains(orderCode),
                contains("Thanh toán khi nhận hàng"), contains(fixture.product().getName()), eq("order confirmed"));
    }

    @Test
    void payosOrder_sendsConfirmationOnlyOncePaid() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(3);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        UUID orderId = UUID.fromString(placeOrder(token, addressId, "PAYOS", null).at("/order/id").asText());
        verify(mail, after(500).never()).sendNotification(eq(email(token)), anyString(), anyString(), anyString(),
                eq("order confirmed"));

        long payosCode = jdbc.queryForObject("SELECT payos_order_code FROM orders WHERE id=?", Long.class, orderId);
        mockMvc.perform(post("/api/v1/orders/payos/return")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderCode\":" + payosCode + "}"))
                .andExpect(status().isOk());

        verify(mail, timeout(5000)).sendNotification(eq(email(token)), anyString(), contains("PayOS"), anyString(),
                eq("order confirmed"));
    }

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
        verify(mail, never()).sendNotification(eq(email(token)), anyString(), anyString(), anyString(),
                eq("order confirmed"));
    }

    private String email(String token) {
        return jdbc.queryForObject("SELECT email FROM user_accounts WHERE id=?", String.class, userId(token));
    }
}
