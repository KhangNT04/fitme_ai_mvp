package com.fitme.product.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminProductControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private ProductRepository productRepository;

    private FitMeUserPrincipal adminPrincipal;
    private Product pendingProduct;

    @BeforeEach
    void setUp() {
        TestDataHelper.BrandOwnerContext brandOwner = testDataHelper.createBrandOwner();
        pendingProduct = testDataHelper.createDraftProductForBrand(brandOwner.brand(), "Pending review item");
        pendingProduct.setStatus(ProductStatus.PENDING_REVIEW);
        pendingProduct = productRepository.save(pendingProduct);
        adminPrincipal = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
    }

    @Test
    void listPendingAndApprove_asAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/admin/products/pending")
                        .with(user(adminPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id=='" + pendingProduct.getId() + "')]").exists());

        mockMvc.perform(post("/api/v1/admin/products/{id}/approve", pendingProduct.getId())
                        .with(user(adminPrincipal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void approveProduct_withoutAuth_returnsForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/admin/products/{id}/approve", pendingProduct.getId()))
                .andExpect(status().isForbidden());
    }
}
