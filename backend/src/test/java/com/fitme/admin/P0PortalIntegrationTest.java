package com.fitme.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class P0PortalIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    /** BR-PRD-20 */
    @Test
    void brandCannotReadEditHideDeleteOrSubmitAnotherBrandsProduct() throws Exception {
        FitMeUserPrincipal brandA = new FitMeUserPrincipal(testDataHelper.createBrandOwner().user());
        TestDataHelper.BrandOwnerContext brandB = testDataHelper.createBrandOwner();
        Product victim = testDataHelper.createDraftProductForBrand(brandB.brand(), "Sản phẩm của brand B");

        List<MockHttpServletRequestBuilder> attacks = List.of(
                get("/api/v1/brand/products/{id}", victim.getId()),
                put("/api/v1/brand/products/{id}", victim.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Bị sửa\",\"category\":\"Áo\",\"price\":1000}"),
                post("/api/v1/brand/products/{id}/hide", victim.getId()),
                post("/api/v1/brand/products/{id}/submit-review", victim.getId()),
                delete("/api/v1/brand/products/{id}", victim.getId()));
        for (MockHttpServletRequestBuilder attack : attacks) {
            mockMvc.perform(attack.with(user(brandA)))
                    .andExpect(status().is4xxClientError())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.data").doesNotExist());
        }

        Map<String, Object> row = jdbc.queryForMap("SELECT name, status, price FROM products WHERE id = ?", victim.getId());
        assertThat(row.get("name")).isEqualTo("Sản phẩm của brand B");
        assertThat(row.get("status")).isEqualTo("DRAFT");
        assertThat(((java.math.BigDecimal) row.get("price")).longValue()).isEqualTo(150_000);
    }

    /** ADM-GRW-04 */
    @Test
    void payingCustomersCsv_neutralisesFormulaInjection() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        Map<String, String> expectedCellByName = new LinkedHashMap<>();
        expectedCellByName.put("=HYPERLINK(\"http://evil.com\")", "\"'=HYPERLINK(\"\"http://evil.com\"\")\"");
        expectedCellByName.put("+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0");
        expectedCellByName.put("-2+3", "'-2+3");
        expectedCellByName.put("@SUM(1+1)", "'@SUM(1+1)");

        Map<String, String> emailByName = new LinkedHashMap<>();
        for (String name : expectedCellByName.keySet()) {
            UserAccount buyer = testDataHelper.createUser().user();
            jdbc.update("UPDATE user_accounts SET display_name = ? WHERE id = ?", name, buyer.getId());
            buyPro(new FitMeUserPrincipal(buyer));
            emailByName.put(name, buyer.getEmail());
        }

        String csv = new String(mockMvc.perform(get("/api/v1/admin/reports/paying-customers/export").with(user(admin)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);

        for (var entry : expectedCellByName.entrySet()) {
            String email = emailByName.get(entry.getKey());
            String line = csv.lines().filter(l -> l.contains(email)).findFirst()
                    .orElseThrow(() -> new AssertionError("CSV row missing for " + email));
            assertThat(line).as(entry.getKey()).contains("," + entry.getValue() + "," + email + ",");
        }
    }

    private void buyPro(FitMeUserPrincipal buyer) throws Exception {
        String planId = null;
        for (JsonNode plan : objectMapper.readTree(mockMvc.perform(get("/api/v1/plans"))
                .andReturn().getResponse().getContentAsString()).get("data")) {
            if ("PRO_MONTHLY".equals(plan.get("code").asText())) {
                planId = plan.get("id").asText();
            }
        }
        assertThat(planId).as("PRO_MONTHLY plan seeded by V18").isNotNull();
        long orderCode = objectMapper.readTree(mockMvc.perform(post("/api/v1/me/subscription/checkout")
                        .with(user(buyer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\":\"%s\"}".formatted(planId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("data").get("payosOrderCode").asLong();
        mockMvc.perform(post("/api/v1/me/subscription/return")
                        .with(user(buyer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderCode\":%d}".formatted(orderCode)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"));
    }
}
