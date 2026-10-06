package com.fitme.tryon;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.ai.client.AiVtonClient.VtonJobResponse;
import com.fitme.brand.entity.Brand;
import com.fitme.common.enums.FitkenEntryType;
import com.fitme.common.enums.ItemRole;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.fitken.repository.FitkenLedgerRepository;
import com.fitme.fitken.service.FitkenService;
import com.fitme.preview.service.VtonTryOnService;
import com.fitme.product.entity.Product;
import com.fitme.settings.service.SystemSettingsService;
import com.fitme.support.TestDataHelper;
import com.fitme.tryon.TryOnFitkenChargingIntegrationTest.StubAiVtonClient;
import com.fitme.tryon.service.PlusFreeTryOnService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Free daily AI try-ons for all-Brand-Plus outfits, around the same stubbed VTON provider as Fitken charging. */
@TestPropertySource(properties = {
        "fitme.ai.mode=hf",
        "fitme.ai.public-base-url=http://localhost:8080",
        "fitme.ai.poll-interval-ms=3600000"
})
@Import(TryOnFitkenChargingIntegrationTest.StubConfig.class)
class PlusFreeTryOnIntegrationTest extends AbstractIntegrationTest {

    private static final String FREE_DAILY_URL = "/api/v1/admin/settings/" + SystemSettingsService.TRYON_PLUS_FREE_DAILY;

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private VtonTryOnService vtonTryOnService;

    @Autowired
    private FitkenService fitkenService;

    @Autowired
    private FitkenLedgerRepository ledgerRepository;

    @Autowired
    private PlusFreeTryOnService plusFreeTryOnService;

    @Autowired
    private SystemSettingsService settingsService;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetStub() {
        StubAiVtonClient.pollQueue.clear();
        StubAiVtonClient.submitResponse = job("job-plus-" + UUID.randomUUID(), "processing", null);
    }

    /** Jobs left PROCESSING would be picked up by other test classes' stubbed pollers. */
    @AfterEach
    void cleanUp() {
        settingsService.update(SystemSettingsService.TRYON_PLUS_FREE_DAILY, "3", null);
        jdbc.update("UPDATE try_on_requests SET status = 'COMPLETED' WHERE id IN (SELECT try_on_request_id "
                + "FROM preview_generations WHERE status = 'PROCESSING' AND vton_job_id LIKE 'job-plus-%')");
        jdbc.update("UPDATE preview_generations SET status = 'SUCCEEDED' "
                + "WHERE status = 'PROCESSING' AND vton_job_id LIKE 'job-plus-%'");
    }

    @Test
    void allPlusOutfitUsesAFreeTryAndSpendsNoFitken() throws Exception {
        FitMeUserPrincipal principal = consumer();
        Brand plus = plusBrand();
        String requestId = createAvatarTryOn(principal,
                testDataHelper.createEligibleProductForBrand(plus, "Plus top", "Áo thun"));

        generate(principal, requestId)
                .andExpect(jsonPath("$.data.status").value("PROCESSING"))
                .andExpect(jsonPath("$.data.freeTry").value(true))
                .andExpect(jsonPath("$.data.chargedFitken").value(0))
                .andExpect(jsonPath("$.data.fitkenBalance").value(5));

        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.CONSUME))
                .isZero();
        assertThat(usageRows(principal.getUserId(), "USED")).isEqualTo(1);
        assertThat(plusFreeTryOnService.remainingToday(principal.getUserId())).isEqualTo(2);
    }

    @Test
    void userWithoutFitkenCanStillTryPlusProductsForFree() throws Exception {
        FitMeUserPrincipal principal = consumer();
        fitkenService.adminAdjust(principal.getUserId(), -5, "test drain");
        assertThat(fitkenService.balance(principal.getUserId())).isZero();
        Brand plus = plusBrand();
        String requestId = createAvatarTryOn(principal,
                testDataHelper.createEligibleProductForBrand(plus, "Plus top", "Áo thun"));

        generate(principal, requestId)
                .andExpect(jsonPath("$.data.freeTry").value(true))
                .andExpect(jsonPath("$.data.fitkenBalance").value(0));
        assertThat(usageRows(principal.getUserId(), "USED")).isEqualTo(1);
    }

    @Test
    void dailyLimitReachedFallsBackToFitken_andAdminSettingChangeTakesEffect() throws Exception {
        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        setFreeDaily(admin, 1);
        FitMeUserPrincipal principal = consumer();
        Brand plus = plusBrand();
        Product top = testDataHelper.createEligibleProductForBrand(plus, "Plus top", "Áo thun");

        quote(principal, top.getId())
                .andExpect(jsonPath("$.data.free").value(true))
                .andExpect(jsonPath("$.data.freeDailyLimit").value(1))
                .andExpect(jsonPath("$.data.freeRemainingToday").value(1));
        generate(principal, createAvatarTryOn(principal, top))
                .andExpect(jsonPath("$.data.freeTry").value(true));

        quote(principal, top.getId())
                .andExpect(jsonPath("$.data.free").value(false))
                .andExpect(jsonPath("$.data.allPlus").value(true))
                .andExpect(jsonPath("$.data.freeRemainingToday").value(0));
        generate(principal, createAvatarTryOn(principal, top))
                .andExpect(jsonPath("$.data.freeTry").value(false))
                .andExpect(jsonPath("$.data.chargedFitken").value(1))
                .andExpect(jsonPath("$.data.fitkenBalance").value(4));
        assertThat(usageRows(principal.getUserId(), "USED")).isEqualTo(1);
        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.CONSUME))
                .isEqualTo(1);

        setFreeDaily(admin, 2);
        quote(principal, top.getId())
                .andExpect(jsonPath("$.data.free").value(true))
                .andExpect(jsonPath("$.data.freeDailyLimit").value(2))
                .andExpect(jsonPath("$.data.freeRemainingToday").value(1));
    }

    @Test
    void mixedPlusAndRegularProductsAreCharged() throws Exception {
        FitMeUserPrincipal principal = consumer();
        Product plusTop = testDataHelper.createEligibleProductForBrand(plusBrand(), "Plus top", "Áo thun");
        Product regularShoes = testDataHelper.createEligibleProduct("Regular shoes", "Giày");
        String requestId = createAvatarTryOn(principal, plusTop);
        addItem(principal, requestId, regularShoes, ItemRole.SHOES);

        quote(principal, plusTop.getId(), regularShoes.getId())
                .andExpect(jsonPath("$.data.allPlus").value(false))
                .andExpect(jsonPath("$.data.free").value(false))
                .andExpect(jsonPath("$.data.freeRemainingToday").value(3));
        generate(principal, requestId)
                .andExpect(jsonPath("$.data.freeTry").value(false))
                .andExpect(jsonPath("$.data.chargedFitken").value(1))
                .andExpect(jsonPath("$.data.fitkenBalance").value(4));
        assertThat(usageRows(principal.getUserId(), null)).isZero();
    }

    @Test
    void expiredBrandPlusIsChargedLikeAnyOtherBrand() throws Exception {
        FitMeUserPrincipal principal = consumer();
        Brand expired = testDataHelper.createApprovedBrand();
        insertSubscription(expired.getId(), Instant.now().minus(31, ChronoUnit.DAYS),
                Instant.now().minus(1, ChronoUnit.DAYS));
        String requestId = createAvatarTryOn(principal,
                testDataHelper.createEligibleProductForBrand(expired, "Expired top", "Áo thun"));

        generate(principal, requestId)
                .andExpect(jsonPath("$.data.freeTry").value(false))
                .andExpect(jsonPath("$.data.fitkenBalance").value(4));
    }

    @Test
    void providerFailureRefundsTheFreeTryNotFitken() throws Exception {
        String jobId = "job-plus-fail-" + UUID.randomUUID();
        StubAiVtonClient.submitResponse = job(jobId, "processing", null);
        StubAiVtonClient.pollQueue.add(job(jobId, "failed", null));
        FitMeUserPrincipal principal = consumer();
        String requestId = createAvatarTryOn(principal,
                testDataHelper.createEligibleProductForBrand(plusBrand(), "Plus fail top", "Áo thun"));

        generate(principal, requestId).andExpect(jsonPath("$.data.freeTry").value(true));
        assertThat(plusFreeTryOnService.remainingToday(principal.getUserId())).isEqualTo(2);

        vtonTryOnService.pollForTryOn(UUID.fromString(requestId));
        vtonTryOnService.pollForTryOn(UUID.fromString(requestId));

        assertThat(usageRows(principal.getUserId(), "REFUNDED")).isEqualTo(1);
        assertThat(usageRows(principal.getUserId(), "USED")).isZero();
        assertThat(jdbc.queryForObject("SELECT refunded_at IS NOT NULL FROM plus_free_tryon_usage WHERE user_id = ?",
                Boolean.class, principal.getUserId())).isTrue();
        assertThat(plusFreeTryOnService.remainingToday(principal.getUserId())).isEqualTo(3);
        assertThat(fitkenService.balance(principal.getUserId())).isEqualTo(5);
        assertThat(ledgerRepository.countByUserIdAndEntryType(principal.getUserId(), FitkenEntryType.REFUND))
                .isZero();
    }

    @Test
    void submitFailureNeitherConsumesAFreeTryNorFitken() throws Exception {
        StubAiVtonClient.submitResponse = job(null, "failed", null);
        FitMeUserPrincipal principal = consumer();
        String requestId = createAvatarTryOn(principal,
                testDataHelper.createEligibleProductForBrand(plusBrand(), "Plus submit fail", "Áo thun"));

        generate(principal, requestId)
                .andExpect(jsonPath("$.data.freeTry").value(false))
                .andExpect(jsonPath("$.data.chargedFitken").value(0))
                .andExpect(jsonPath("$.data.fitkenBalance").value(5));
        assertThat(usageRows(principal.getUserId(), null)).isZero();
    }

    @Test
    void quoteForGuestsNeverOffersAFreeTry() throws Exception {
        Product plusTop = testDataHelper.createEligibleProductForBrand(plusBrand(), "Plus top", "Áo thun");
        Product regular = testDataHelper.createEligibleProduct("Regular top", "Áo thun");

        mockMvc.perform(get("/api/v1/try-on/quote").param("productIds", plusTop.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allPlus").value(true))
                .andExpect(jsonPath("$.data.free").value(false))
                .andExpect(jsonPath("$.data.freeRemainingToday").value(0))
                .andExpect(jsonPath("$.data.freeDailyLimit").value(3))
                .andExpect(jsonPath("$.data.fitkenCost").value(1));
        mockMvc.perform(get("/api/v1/try-on/quote").param("productIds", regular.getId().toString()))
                .andExpect(jsonPath("$.data.allPlus").value(false));
        mockMvc.perform(get("/api/v1/try-on/quote"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.allPlus").value(false))
                .andExpect(jsonPath("$.data.free").value(false));
        mockMvc.perform(get("/api/v1/try-on/quote").param("productIds", "not-a-uuid"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void tryConsumeIsIdempotentPerRefAndSerializedPerUser() throws Exception {
        settingsService.update(SystemSettingsService.TRYON_PLUS_FREE_DAILY, "1", null);
        UUID userId = consumer().getUserId();

        int threads = 6;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                Callable<Boolean> attempt = () -> {
                    start.await();
                    return plusFreeTryOnService.tryConsume(userId, UUID.randomUUID());
                };
                results.add(pool.submit(attempt));
            }
            start.countDown();
            int granted = 0;
            for (Future<Boolean> result : results) {
                if (result.get()) {
                    granted++;
                }
            }
            assertThat(granted).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(usageRows(userId, "USED")).isEqualTo(1);

        UUID usedRef = jdbc.queryForObject("SELECT try_on_ref FROM plus_free_tryon_usage WHERE user_id = ?",
                UUID.class, userId);
        assertThat(plusFreeTryOnService.tryConsume(userId, usedRef)).isTrue();
        assertThat(usageRows(userId, null)).isEqualTo(1);
        assertThat(plusFreeTryOnService.refund(usedRef)).isTrue();
        assertThat(plusFreeTryOnService.refund(usedRef)).isFalse();
        assertThat(plusFreeTryOnService.tryConsume(userId, usedRef)).isFalse();
    }

    private FitMeUserPrincipal consumer() {
        return new FitMeUserPrincipal(testDataHelper.createUser().user());
    }

    private Brand plusBrand() {
        Brand brand = testDataHelper.createApprovedBrand();
        insertSubscription(brand.getId(), Instant.now().minus(1, ChronoUnit.DAYS), Instant.now().plus(29, ChronoUnit.DAYS));
        return brand;
    }

    private void insertSubscription(UUID brandId, Instant startsAt, Instant endsAt) {
        jdbc.update("INSERT INTO brand_subscriptions (brand_id, plan_id, status, starts_at, ends_at) "
                        + "VALUES (?, (SELECT id FROM billing_plans WHERE code = 'BRAND_PLUS'), 'ACTIVE', ?, ?)",
                brandId, Timestamp.from(startsAt), Timestamp.from(endsAt));
    }

    private long usageRows(UUID userId, String status) {
        return status == null
                ? jdbc.queryForObject("SELECT COUNT(*) FROM plus_free_tryon_usage WHERE user_id = ?", Long.class, userId)
                : jdbc.queryForObject("SELECT COUNT(*) FROM plus_free_tryon_usage WHERE user_id = ? AND status = ?",
                        Long.class, userId, status);
    }

    private void setFreeDaily(FitMeUserPrincipal admin, int value) throws Exception {
        mockMvc.perform(put(FREE_DAILY_URL)
                        .with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"value\": \"%d\"}".formatted(value)))
                .andExpect(status().isOk());
    }

    private ResultActions quote(FitMeUserPrincipal principal, UUID... productIds) throws Exception {
        String ids = String.join(",", java.util.Arrays.stream(productIds).map(UUID::toString).toList());
        return mockMvc.perform(get("/api/v1/try-on/quote").param("productIds", ids).with(user(principal)))
                .andExpect(status().isOk());
    }

    private ResultActions generate(FitMeUserPrincipal principal, String requestId) throws Exception {
        return mockMvc.perform(post("/api/v1/try-on/requests/{id}/generate", requestId).with(user(principal)))
                .andExpect(status().isOk());
    }

    private String createAvatarTryOn(FitMeUserPrincipal principal, Product top) throws Exception {
        String body = mockMvc.perform(post("/api/v1/try-on/requests")
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"previewMode": "AVATAR", "avatarKey": "avatar-female-1", "heightCm": 165, "weightKg": 55}
                                """))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode data = objectMapper.readTree(body).get("data");
        String requestId = data.get("id").asText();
        addItem(principal, requestId, top, ItemRole.TOP);
        return requestId;
    }

    private void addItem(FitMeUserPrincipal principal, String requestId, Product product, ItemRole role)
            throws Exception {
        mockMvc.perform(post("/api/v1/try-on/requests/{id}/items", requestId)
                        .with(user(principal))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId": "%s", "role": "%s", "selectedSize": "M"}
                                """.formatted(product.getId(), role)))
                .andExpect(status().isOk());
    }

    private static VtonJobResponse job(String jobId, String status, String outputUrl) {
        VtonJobResponse response = new VtonJobResponse();
        response.setJobId(jobId);
        response.setStatus(status);
        response.setOutputImageUrl(outputUrl);
        return response;
    }
}
