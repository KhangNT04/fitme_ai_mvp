package com.fitme.product.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductControllerTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    private Product product;

    @BeforeEach
    void setUp() {
        TestDataHelper.BrandOwnerContext brand = testDataHelper.createBrandOwner();
        product = testDataHelper.createEligibleProduct("Public catalog item", "Áo thun");
    }

    @Test
    void listProducts_returnsActiveItems() throws Exception {
        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void listProducts_searchByBrandName_returnsMatchingProducts() throws Exception {
        mockMvc.perform(get("/api/v1/products").param("search", "Test Brand"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[?(@.name == 'Public catalog item')]").exists());
    }

    @Test
    void listProducts_searchByProductName_returnsMatchingProducts() throws Exception {
        mockMvc.perform(get("/api/v1/products").param("search", "Public catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.name == 'Public catalog item')]").exists());
    }

    @Test
    void getProductById_returnsDetail() throws Exception {
        mockMvc.perform(get("/api/v1/products/{id}", product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(product.getId().toString()))
                .andExpect(jsonPath("$.data.name").value("Public catalog item"));
    }
}
