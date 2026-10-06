package com.fitme.brandplus;

import com.fitme.AbstractIntegrationTest;
import com.fitme.brand.entity.Brand;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Public product and brand DTOs flag brands whose Brand Plus is active right now. */
class BrandPlusBadgeIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testData;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void productAndBrandDtosFlagOnlyActivePlusBrands() throws Exception {
        Brand active = testData.createApprovedBrand();
        Brand expired = testData.createApprovedBrand();
        Brand regular = testData.createApprovedBrand();
        insertSubscription(active.getId(), Instant.now().minus(1, ChronoUnit.DAYS), Instant.now().plus(29, ChronoUnit.DAYS));
        insertSubscription(expired.getId(), Instant.now().minus(31, ChronoUnit.DAYS), Instant.now().minus(1, ChronoUnit.DAYS));
        Product activeProduct = testData.createEligibleProductForBrand(active, "Plus tee", "Áo thun");
        Product expiredProduct = testData.createEligibleProductForBrand(expired, "Expired tee", "Áo thun");
        Product regularProduct = testData.createEligibleProductForBrand(regular, "Regular tee", "Áo thun");

        mockMvc.perform(get("/api/v1/products/{id}", activeProduct.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plusBrand").value(true));
        mockMvc.perform(get("/api/v1/products/{id}", expiredProduct.getId()))
                .andExpect(jsonPath("$.data.plusBrand").value(false));
        mockMvc.perform(get("/api/v1/products/{id}", regularProduct.getId()))
                .andExpect(jsonPath("$.data.plusBrand").value(false));

        mockMvc.perform(get("/api/v1/products").param("search", "tee"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusBrand".formatted(activeProduct.getId())).value(true))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusBrand".formatted(expiredProduct.getId())).value(false))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusBrand".formatted(regularProduct.getId())).value(false));

        mockMvc.perform(get("/api/v1/brands/{id}", active.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plusBrand").value(true));
        mockMvc.perform(get("/api/v1/brands/{id}", expired.getId()))
                .andExpect(jsonPath("$.data.plusBrand").value(false));
        mockMvc.perform(get("/api/v1/brands"))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusBrand".formatted(active.getId())).value(true))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].plusBrand".formatted(regular.getId())).value(false));
    }

    @Test
    void similarProductsListBrandPlusFirst() throws Exception {
        Brand active = testData.createApprovedBrand();
        insertSubscription(active.getId(), Instant.now().minus(1, ChronoUnit.DAYS), Instant.now().plus(29, ChronoUnit.DAYS));
        Product anchor = testData.createEligibleProduct("Anchor tee", "Áo thun");
        testData.createEligibleProductForBrand(active, "Plus similar tee", "Áo thun");

        String body = mockMvc.perform(get("/api/v1/products/{id}/similar", anchor.getId()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Boolean> plusFlags = new ArrayList<>();
        objectMapper.readTree(body).get("data").forEach(p -> plusFlags.add(p.get("plusBrand").asBoolean()));

        assertThat(plusFlags).isNotEmpty();
        assertThat(plusFlags.getFirst()).isTrue();
        assertThat(plusFlags.subList(plusFlags.indexOf(false) < 0 ? plusFlags.size() : plusFlags.indexOf(false),
                plusFlags.size())).doesNotContain(true);
    }

    private void insertSubscription(UUID brandId, Instant startsAt, Instant endsAt) {
        jdbc.update("INSERT INTO brand_subscriptions (brand_id, plan_id, status, starts_at, ends_at) "
                        + "VALUES (?, (SELECT id FROM billing_plans WHERE code = 'BRAND_PLUS'), 'ACTIVE', ?, ?)",
                brandId, Timestamp.from(startsAt), Timestamp.from(endsAt));
    }
}
