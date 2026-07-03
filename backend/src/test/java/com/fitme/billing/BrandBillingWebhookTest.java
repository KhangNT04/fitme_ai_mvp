package com.fitme.billing;

import com.fitme.AbstractIntegrationTest;
import com.fitme.billing.entity.BrandBillingOrder;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.repository.BrandBillingOrderRepository;
import com.fitme.billing.service.BrandBillingService;
import com.fitme.billing.service.BrandQuotaService;
import com.fitme.common.enums.BillingOrderStatus;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BrandBillingWebhookTest extends AbstractIntegrationTest {

    @Autowired
    private BrandBillingService brandBillingService;
    @Autowired
    private BrandQuotaService brandQuotaService;
    @Autowired
    private BillingPlanRepository billingPlanRepository;
    @Autowired
    private BrandBillingOrderRepository orderRepository;
    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void webhook_grantsQuota_idempotent() {
        var brand = testDataHelper.createBrandOwner().brand();
        var plan = billingPlanRepository.findByCode("TOPUP_250").orElseThrow();
        long orderCode = System.currentTimeMillis() % 9_000_000_000L * 10L
                + ThreadLocalRandom.current().nextInt(10);
        BrandBillingOrder order = orderRepository.save(BrandBillingOrder.builder()
                .brandId(brand.getId())
                .planId(plan.getId())
                .amountVnd(plan.getPriceVnd())
                .status(BillingOrderStatus.PENDING)
                .payosOrderCode(orderCode)
                .build());

        String webhookBody = "{\"data\":{\"orderCode\":" + orderCode + "}}";
        brandBillingService.handleWebhook(webhookBody);
        assertThat(brandQuotaService.getOrCreateBalance(brand.getId()).getTopupRemaining()).isEqualTo(250);

        brandBillingService.handleWebhook(webhookBody);
        assertThat(brandQuotaService.getOrCreateBalance(brand.getId()).getTopupRemaining()).isEqualTo(250);
    }

    @Test
    void webhook_unknownOrderCode_acknowledgedWithoutGrantingQuota() {
        var brand = testDataHelper.createBrandOwner().brand();
        int before = brandQuotaService.getOrCreateBalance(brand.getId()).getTopupRemaining();

        String payOsSampleBody = "{\"data\":{\"orderCode\":123}}";
        assertThatCode(() -> brandBillingService.handleWebhook(payOsSampleBody))
                .doesNotThrowAnyException();

        assertThat(brandQuotaService.getOrCreateBalance(brand.getId()).getTopupRemaining()).isEqualTo(before);
    }

    @Test
    void webhook_httpEndpoint_returnsOkForUnknownOrder() throws Exception {
        mockMvc.perform(post("/api/v1/webhooks/payos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"data\":{\"orderCode\":123}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
