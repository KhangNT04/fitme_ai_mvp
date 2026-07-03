package com.fitme.billing;

import com.fitme.AbstractIntegrationTest;
import com.fitme.billing.repository.BillingPlanRepository;
import com.fitme.billing.service.BrandQuotaService;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BrandBillingIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;
    @Autowired
    private BillingPlanRepository billingPlanRepository;
    @Autowired
    private BrandQuotaService brandQuotaService;
    @Autowired
    private ProductRepository productRepository;

    private FitMeUserPrincipal brandPrincipal;
    private UUID brandId;

    @BeforeEach
    void setUp() {
        var ctx = testDataHelper.createBrandOwner();
        brandPrincipal = new FitMeUserPrincipal(ctx.user());
        brandId = ctx.brand().getId();
    }

    @Test
    void listPlans_returnsSeededPlans() throws Exception {
        mockMvc.perform(get("/api/v1/brand/billing/plans").with(user(brandPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].code").exists());
    }

    @Test
    void checkout_mockMode_grantsQuota() throws Exception {
        var plan = billingPlanRepository.findByCode("TOPUP_150").orElseThrow();
        mockMvc.perform(post("/api/v1/brand/billing/checkout")
                        .with(user(brandPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"" + plan.getId() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mockPaid").value(true));

        assertThat(brandQuotaService.hasTryOnQuota(brandId)).isTrue();
        assertThat(brandQuotaService.getOrCreateBalance(brandId).getTopupRemaining()).isEqualTo(150);
    }

    @Test
    void productWithoutQuota_notEligibleForTryOn() {
        var ctx = testDataHelper.createBrandOwner();
        Product product = testDataHelper.createDraftProductForBrand(ctx.brand(), "Draft");
        // promote to active-like product without quota
        product.setStatus(com.fitme.common.enums.ProductStatus.ACTIVE);
        product.setPurchaseUrl("https://shopee.vn/no-quota");
        product.setCategory("Áo thun");
        productRepository.save(product);
        brandQuotaService.refreshBrandProductEligibility(ctx.brand().getId());
        Product refreshed = productRepository.findById(product.getId()).orElseThrow();
        assertThat(refreshed.isAiTryOnEligible()).isFalse();
    }

    @Test
    void adjustQuota_enablesProductEligibility() {
        Product product = testDataHelper.createEligibleProduct("Quota top", "Áo thun");
        UUID productBrandId = product.getBrandId();
        brandQuotaService.adjustQuota(productBrandId, 500, 0, "test");
        brandQuotaService.refreshBrandProductEligibility(productBrandId);
        Product refreshed = productRepository.findById(product.getId()).orElseThrow();
        assertThat(refreshed.isAiTryOnEligible()).isTrue();
    }

    @Test
    void adminDeactivate_revokesQuotaAndCancelsSubscription() throws Exception {
        var plan = billingPlanRepository.findByCode("TOPUP_150").orElseThrow();
        mockMvc.perform(post("/api/v1/brand/billing/checkout")
                        .with(user(brandPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"" + plan.getId() + "\"}"))
                .andExpect(status().isOk());

        var admin = testDataHelper.createAdmin();
        var adminPrincipal = new FitMeUserPrincipal(admin.user());

        mockMvc.perform(post("/api/v1/admin/billing/brands/" + brandId + "/deactivate")
                        .with(user(adminPrincipal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"test revoke\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRemaining").value(0))
                .andExpect(jsonPath("$.data.billingActive").value(false));

        assertThat(brandQuotaService.hasTryOnQuota(brandId)).isFalse();
    }
}
