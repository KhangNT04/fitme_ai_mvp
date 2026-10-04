package com.fitme.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.common.enums.ProductStatus;
import com.fitme.common.security.JwtService;
import com.fitme.common.time.AppClock;
import com.fitme.order.service.OrderPaymentTimeoutJob;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductVariant;
import com.fitme.product.repository.ProductRepository;
import com.fitme.product.repository.ProductVariantRepository;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public abstract class CommerceIntegrationSupport extends AbstractIntegrationTest {
    @Autowired protected TestDataHelper testData;
    @Autowired protected ProductRepository products;
    @Autowired protected ProductVariantRepository variants;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected JwtService jwtService;
    @Autowired protected AppClock appClock;
    @Autowired protected OrderPaymentTimeoutJob paymentTimeoutJob;

    protected record ProductFixture(TestDataHelper.BrandOwnerContext owner, Product product, ProductVariant variant) {}

    @AfterEach
    void resetCommerceClock() {
        appClock.reset();
    }

    protected ProductFixture productFixture(int stock) {
        TestDataHelper.BrandOwnerContext owner = testData.createBrandOwner();
        Product product = testData.createDraftProductForBrand(owner.brand(), "Sản phẩm commerce " + UUID.randomUUID());
        product.setStatus(ProductStatus.ACTIVE);
        products.save(product);
        ProductVariant variant = variants.findByProductId(product.getId()).getFirst();
        variant.setStockQuantity(stock);
        variants.save(variant);
        return new ProductFixture(owner, product, variant);
    }

    protected UUID userId(String token) {
        return jwtService.getUserId(token);
    }

    protected UUID createAddress(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/me/addresses")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipientName":"Nguyễn Văn An",
                                  "phone":"0901234567",
                                  "province":"TP Hồ Chí Minh",
                                  "district":"Quận 1",
                                  "ward":"Bến Nghé",
                                  "street":"1 Lê Lợi",
                                  "isDefault":true
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();
        return UUID.fromString(data(result).get("id").asText());
    }

    protected void addToCart(String token, ProductFixture fixture, int quantity) throws Exception {
        mockMvc.perform(post("/api/v1/cart/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":"%s","variantId":"%s","quantity":%d}
                                """.formatted(fixture.product().getId(), fixture.variant().getId(), quantity)))
                .andExpect(status().isOk());
    }

    protected JsonNode placeOrder(String token, UUID addressId, String method, UUID voucherId) throws Exception {
        String voucher = voucherId == null ? "" : ",\"voucherId\":\"" + voucherId + "\"";
        MvcResult result = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","paymentMethod":"%s"%s}
                                """.formatted(addressId, method, voucher)))
                .andExpect(status().isOk())
                .andReturn();
        return data(result);
    }

    /** Shifts the stored timestamp in SQL so the test does not depend on JVM vs UTC time zones. */
    protected void backdateOrder(UUID orderId) {
        jdbc.update("UPDATE orders SET created_at = created_at - INTERVAL '2 hours' WHERE id=?", orderId);
    }

    protected UUID sellerOrderId(JsonNode checkout, int index) {
        return UUID.fromString(checkout.at("/order/sellerOrders/" + index + "/id").asText());
    }

    protected JsonNode data(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("data");
    }
}
