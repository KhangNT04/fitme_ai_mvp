package com.fitme.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.product.entity.Product;
import com.fitme.product.entity.ProductVariant;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class P0CommerceIntegrationTest extends CommerceIntegrationSupport {

    private record Outcome(int status, String errorCode, String error) {}

    /** CART-15 */
    @Test
    void addToCart_rejectsForeignVariantAndDraftProduct() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture shirt = productFixture(5);
        ProductFixture other = productFixture(5);
        Product draft = testData.createDraftProductForBrand(shirt.owner().brand(), "Draft " + UUID.randomUUID());
        ProductVariant draftVariant = variants.findByProductId(draft.getId()).getFirst();
        draftVariant.setStockQuantity(5);
        variants.save(draftVariant);

        for (UUID[] pair : new UUID[][]{
                {shirt.product().getId(), other.variant().getId()},
                {draft.getId(), draftVariant.getId()}}) {
            mockMvc.perform(post("/api/v1/cart/items")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"productId\":\"%s\",\"variantId\":\"%s\",\"quantity\":1}".formatted(pair[0], pair[1])))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Sản phẩm không thể mua"));
        }
        mockMvc.perform(get("/api/v1/cart").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.itemCount").value(0));
    }

    /** CHK-13 */
    @Test
    void placeOrder_withSomeoneElsesAddress_isNotFound() throws Exception {
        String owner = registerUserAccessToken();
        String buyer = registerUserAccessToken();
        UUID ownersAddress = createAddress(owner);
        ProductFixture fixture = productFixture(3);
        addToCart(buyer, fixture, 1);

        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + buyer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"addressId\":\"%s\",\"paymentMethod\":\"COD\"}".formatted(ownersAddress)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Địa chỉ không tồn tại"));

        assertThat(orderCount(buyer)).isZero();
        assertThat(stock(fixture)).isEqualTo(3);
        assertThat(cartItemIds(buyer)).hasSize(1);
    }

    /** CHK-14 */
    @Test
    void placeOrder_cannotBuySomeoneElsesCartLines() throws Exception {
        String victim = registerUserAccessToken();
        String attacker = registerUserAccessToken();
        List<ProductFixture> victimItems = List.of(productFixture(5), productFixture(5), productFixture(5));
        for (ProductFixture fixture : victimItems) {
            addToCart(victim, fixture, 1);
        }
        ProductFixture attackerItem = productFixture(5);
        addToCart(attacker, attackerItem, 1);
        UUID attackerAddress = createAddress(attacker);
        List<UUID> victimLines = cartItemIds(victim);
        UUID attackerLine = cartItemIds(attacker).getFirst();

        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody(attackerAddress, List.of(victimLines.get(0), victimLines.get(1)))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("CART_EMPTY"));

        JsonNode mixed = data(mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + attacker)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody(attackerAddress, List.of(victimLines.get(2), attackerLine))))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(mixed.at("/order/sellerOrders").size()).isEqualTo(1);
        assertThat(mixed.at("/order/sellerOrders/0/items").size()).isEqualTo(1);
        assertThat(mixed.at("/order/sellerOrders/0/items/0/productId").asText())
                .isEqualTo(attackerItem.product().getId().toString());

        assertThat(cartItemIds(victim)).containsExactlyInAnyOrderElementsOf(victimLines);
        for (ProductFixture fixture : victimItems) {
            assertThat(stock(fixture)).isEqualTo(5);
        }

        UUID victimAddress = createAddress(victim);
        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + victim)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody(victimAddress, victimLines.subList(0, 2))))
                .andExpect(status().isOk());
        assertThat(cartItemIds(victim)).containsExactly(victimLines.get(2));
    }

    /** PAY-14 */
    @Test
    void doubleSubmitSameCart_createsOneOrderAndReservesStockOnce() throws Exception {
        String token = registerUserAccessToken();
        ProductFixture fixture = productFixture(5);
        UUID addressId = createAddress(token);
        addToCart(token, fixture, 1);
        String body = orderBody(addressId, null);

        List<Outcome> outcomes = race(List.of(() -> placeRaw(token, body), () -> placeRaw(token, body)));

        assertThat(outcomes).filteredOn(o -> o.status() == 200).hasSize(1);
        assertThat(outcomes).filteredOn(o -> o.status() == 400 && "CART_EMPTY".equals(o.errorCode())).hasSize(1);
        assertThat(orderCount(token)).isEqualTo(1);
        assertThat(stock(fixture)).isEqualTo(4);
    }

    /** PAY-15 */
    @Test
    void concurrentBuyersOfLastUnit_exactlyOneSucceedsAndStockNeverNegative() throws Exception {
        int buyers = 5;
        ProductFixture fixture = productFixture(buyers);
        List<Callable<Outcome>> attempts = new ArrayList<>();
        List<String> tokens = new ArrayList<>();
        for (int i = 0; i < buyers; i++) {
            String token = registerUserAccessToken();
            addToCart(token, fixture, 1);
            String body = orderBody(createAddress(token), null);
            tokens.add(token);
            attempts.add(() -> placeRaw(token, body));
        }
        jdbc.update("UPDATE product_variants SET stock_quantity = 1 WHERE id = ?", fixture.variant().getId());

        List<Outcome> outcomes = race(attempts);

        assertThat(outcomes).filteredOn(o -> o.status() == 200).hasSize(1);
        assertThat(outcomes).filteredOn(o -> o.status() != 200).hasSize(buyers - 1)
                .allSatisfy(o -> {
                    assertThat(o.status()).isEqualTo(400);
                    assertThat(o.errorCode()).isEqualTo("OUT_OF_STOCK");
                    assertThat(o.error()).contains("hết hàng");
                });
        assertThat(stock(fixture)).isZero();
        assertThat(jdbc.queryForObject("SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE variant_id = ?",
                Long.class, fixture.variant().getId())).isEqualTo(1);
        assertThat(tokens.stream().mapToLong(this::orderCount).sum()).isEqualTo(1);
    }

    /** SUB-10 */
    @Test
    void subscriptionWebhookDeliveredTwice_creditsFitkenOnce() throws Exception {
        FitMeUserPrincipal principal = new FitMeUserPrincipal(testData.createUser().user());
        long orderCode = 100_000_000_000L + Math.floorMod(System.nanoTime(), 900_000_000_000L);
        jdbc.update("INSERT INTO consumer_billing_orders (user_id, plan_id, amount_vnd, status, payos_order_code) "
                + "VALUES (?, ?::uuid, 49000, 'PENDING', ?)", principal.getUserId(), proPlanId(), orderCode);
        UUID billingOrderId = jdbc.queryForObject(
                "SELECT id FROM consumer_billing_orders WHERE payos_order_code = ?", UUID.class, orderCode);
        String webhook = "{\"data\":{\"orderCode\":%d,\"code\":\"00\",\"amount\":49000}}".formatted(orderCode);

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/webhooks/payos").contentType(MediaType.APPLICATION_JSON).content(webhook))
                    .andExpect(status().isOk());
        }

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM fitken_ledger WHERE reference_id = ? "
                + "AND entry_type = 'SUBSCRIPTION_GRANT'", Long.class, billingOrderId)).isEqualTo(1);
        mockMvc.perform(get("/api/v1/me/fitken").with(user(principal)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subscriptionRemaining").value(15))
                .andExpect(jsonPath("$.data.plan").value("PRO"));
        assertThat(jdbc.queryForObject("SELECT status FROM consumer_billing_orders WHERE id = ?",
                String.class, billingOrderId)).isEqualTo("PAID");
    }

    private Outcome placeRaw(String token, String body) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn();
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return new Outcome(result.getResponse().getStatus(), json.path("errorCode").asText(null),
                json.path("error").asText(null));
    }

    /** Releases every attempt at the same instant so the checkouts genuinely overlap. */
    private List<Outcome> race(List<Callable<Outcome>> attempts) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(attempts.size());
        try {
            CountDownLatch ready = new CountDownLatch(attempts.size());
            CountDownLatch go = new CountDownLatch(1);
            List<Future<Outcome>> futures = new ArrayList<>();
            for (Callable<Outcome> attempt : attempts) {
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    return attempt.call();
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            List<Outcome> outcomes = new ArrayList<>();
            for (Future<Outcome> future : futures) {
                outcomes.add(future.get(60, TimeUnit.SECONDS));
            }
            return outcomes;
        } finally {
            pool.shutdownNow();
        }
    }

    private static String orderBody(UUID addressId, List<UUID> cartItemIds) {
        String items = cartItemIds == null ? "" : ",\"cartItemIds\":[" + String.join(",",
                cartItemIds.stream().map(id -> "\"" + id + "\"").toList()) + "]";
        return "{\"addressId\":\"%s\",\"paymentMethod\":\"COD\"%s}".formatted(addressId, items);
    }

    private List<UUID> cartItemIds(String token) {
        return jdbc.queryForList("SELECT ci.id FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = ?",
                UUID.class, userId(token));
    }

    private long orderCount(String token) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE user_id = ?", Long.class, userId(token));
    }

    private int stock(ProductFixture fixture) {
        return jdbc.queryForObject("SELECT stock_quantity FROM product_variants WHERE id = ?",
                Integer.class, fixture.variant().getId());
    }

    private String proPlanId() throws Exception {
        JsonNode plans = data(mockMvc.perform(get("/api/v1/plans")).andExpect(status().isOk()).andReturn());
        for (JsonNode plan : plans) {
            if ("PRO_MONTHLY".equals(plan.get("code").asText())) {
                return plan.get("id").asText();
            }
        }
        throw new AssertionError("PRO_MONTHLY plan seeded by V18");
    }
}
