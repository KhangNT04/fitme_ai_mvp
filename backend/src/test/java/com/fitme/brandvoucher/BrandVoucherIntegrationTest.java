package com.fitme.brandvoucher;

import com.fasterxml.jackson.databind.JsonNode;
import com.fitme.AbstractIntegrationTest;
import com.fitme.billing.service.BillingOrderExpiryJob;
import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.brandvoucher.service.BrandVoucherService;
import com.fitme.common.exception.ConflictException;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Phase 5 brand vouchers: admin campaigns, issuing, Brand Plus checkout with a voucher and the voucher lifecycle. */
class BrandVoucherIntegrationTest extends AbstractIntegrationTest {

    private static final long LIST_PRICE = 999_000;
    private static final String CODE_PATTERN = "^FITME-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$";

    @Autowired
    private TestDataHelper testData;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private BrandPlusService brandPlusService;

    @Autowired
    private BrandVoucherService brandVoucherService;

    @Autowired
    private BillingOrderExpiryJob expiryJob;

    @AfterEach
    void restoreBrandPlusPlan() {
        jdbc.update("UPDATE billing_plans SET price_vnd = ?, active = TRUE, billing_period_days = 30, "
                + "discount_percent = NULL, discount_starts_at = NULL, discount_ends_at = NULL "
                + "WHERE code = 'BRAND_PLUS'", LIST_PRICE);
    }

    @Test
    void migrationSeedsTheTemplateCampaignWithoutIssuingVouchers() throws Exception {
        Map<String, Object> seeded = jdbc.queryForMap("SELECT id, description, discount_percent, vouchers_per_brand, "
                + "max_brands, valid_from, valid_until, active FROM voucher_campaigns WHERE name = 'Brand tiên phong'");
        assertThat(seeded)
                .containsEntry("description", "Ưu đãi cho brand tiên phong")
                .containsEntry("discount_percent", 50)
                .containsEntry("vouchers_per_brand", 3)
                .containsEntry("max_brands", 5)
                .containsEntry("active", true)
                .containsEntry("valid_from", null)
                .containsEntry("valid_until", null);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_vouchers WHERE campaign_id = ?", Long.class,
                seeded.get("id"))).isZero();

        mockMvc.perform(get("/api/v1/admin/voucher-campaigns").with(user(admin())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.name == 'Brand tiên phong')].discountPercent").value(50))
                .andExpect(jsonPath("$.data[?(@.name == 'Brand tiên phong')].issuedBrandCount").value(0))
                .andExpect(jsonPath("$.data[?(@.name == 'Brand tiên phong')].voucherCountsByStatus.ISSUED").value(0));
    }

    @Test
    void issueGivesEveryBrandItsVouchers_skipsBrandsAlreadyServed_andStopsAtMaxBrands() throws Exception {
        FitMeUserPrincipal admin = admin();
        String campaignId = createCampaign(admin, 50, 2, 3, null);
        UUID brandA = testData.createApprovedBrand().getId();
        UUID brandB = testData.createApprovedBrand().getId();
        UUID brandC = testData.createApprovedBrand().getId();
        UUID brandD = testData.createApprovedBrand().getId();

        issue(admin, campaignId, brandA, brandB)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vouchersIssued").value(4))
                .andExpect(jsonPath("$.data.issued", hasSize(2)))
                .andExpect(jsonPath("$.data.skipped", hasSize(0)))
                .andExpect(jsonPath("$.data.campaign.issuedBrandCount").value(2));
        assertThat(voucherCount(campaignId)).isEqualTo(4);
        assertThat(jdbc.queryForList("SELECT code FROM brand_vouchers WHERE campaign_id = ?::uuid", String.class,
                campaignId)).allMatch(code -> code.matches(CODE_PATTERN)).doesNotHaveDuplicates();
        assertThat(jdbc.queryForList("SELECT DISTINCT discount_percent FROM brand_vouchers WHERE campaign_id = ?::uuid",
                Integer.class, campaignId)).containsExactly(50);

        issue(admin, campaignId, brandA, brandC)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vouchersIssued").value(2))
                .andExpect(jsonPath("$.data.issued[0].brandId").value(brandC.toString()))
                .andExpect(jsonPath("$.data.skipped[0].brandId").value(brandA.toString()))
                .andExpect(jsonPath("$.data.skipped[0].brandName").isNotEmpty());
        assertThat(voucherCount(campaignId)).isEqualTo(6);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_vouchers WHERE campaign_id = ?::uuid AND brand_id = ?",
                Long.class, campaignId, brandA)).isEqualTo(2);

        issue(admin, campaignId, brandD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_CAMPAIGN_FULL"));
        assertThat(voucherCount(campaignId)).isEqualTo(6);

        mockMvc.perform(get("/api/v1/admin/voucher-campaigns").with(user(admin)))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].issuedBrandCount".formatted(campaignId)).value(3))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].voucherCount".formatted(campaignId)).value(6))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].voucherCountsByStatus.ISSUED".formatted(campaignId)).value(6))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].voucherCountsByStatus.USED".formatted(campaignId)).value(0));
        mockMvc.perform(get("/api/v1/admin/voucher-campaigns/{id}/vouchers", campaignId).with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(6)))
                .andExpect(jsonPath("$.data[0].brandName").isNotEmpty())
                .andExpect(jsonPath("$.data[0].status").value("ISSUED"));
    }

    @Test
    void issuingMoreBrandsThanMaxBrandsInOneCallIsRejectedWholesale() throws Exception {
        FitMeUserPrincipal admin = admin();
        String campaignId = createCampaign(admin, 30, 1, 1, null);

        issue(admin, campaignId, testData.createApprovedBrand().getId(), testData.createApprovedBrand().getId())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_CAMPAIGN_FULL"));
        assertThat(voucherCount(campaignId)).isZero();
    }

    @Test
    void issueRequiresAnActiveRunningCampaignAndApprovedExistingBrands() throws Exception {
        FitMeUserPrincipal admin = admin();
        UUID approved = testData.createApprovedBrand().getId();

        String inactive = createCampaign(admin, 30, 1, 5, null);
        jdbc.update("UPDATE voucher_campaigns SET active = FALSE WHERE id = ?::uuid", inactive);
        issue(admin, inactive, approved).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_CAMPAIGN_INACTIVE"));

        String ended = createCampaign(admin, 30, 1, 5, null);
        jdbc.update("UPDATE voucher_campaigns SET valid_from = ?, valid_until = ? WHERE id = ?::uuid",
                Timestamp.from(Instant.now().minus(10, ChronoUnit.DAYS)),
                Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)), ended);
        issue(admin, ended, approved).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_CAMPAIGN_ENDED"));

        String running = createCampaign(admin, 30, 1, 5, null);
        UUID pending = testData.createApprovedBrand().getId();
        jdbc.update("UPDATE brands SET status = 'PENDING' WHERE id = ?", pending);
        issue(admin, running, approved, pending).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BRAND_NOT_APPROVED"));
        issue(admin, running, UUID.randomUUID()).andExpect(status().isNotFound());
        assertThat(voucherCount(running)).isZero();
        issue(admin, UUID.randomUUID().toString(), approved).andExpect(status().isNotFound());
    }

    @Test
    void campaignValidation_andPercentEditsDoNotTouchIssuedVouchers() throws Exception {
        FitMeUserPrincipal admin = admin();
        campaignRequest(admin, post("/api/v1/admin/voucher-campaigns"), 100, 1, 1, null, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Phần trăm giảm phải từ 1 đến 99"));
        Instant from = Instant.now().plus(2, ChronoUnit.DAYS);
        campaignRequest(admin, post("/api/v1/admin/voucher-campaigns"), 20, 1, 1, from, from.minus(1, ChronoUnit.DAYS))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Thời điểm kết thúc phải sau thời điểm bắt đầu"));

        String campaignId = createCampaign(admin, 40, 1, 2, null);
        UUID brandA = testData.createApprovedBrand().getId();
        UUID brandB = testData.createApprovedBrand().getId();
        issue(admin, campaignId, brandA, brandB).andExpect(status().isOk());

        campaignRequest(admin, put("/api/v1/admin/voucher-campaigns/{id}", campaignId), 70, 1, 1, null, null)
                .andExpect(status().isBadRequest());
        campaignRequest(admin, put("/api/v1/admin/voucher-campaigns/{id}", campaignId), 70, 1, 4, null, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.discountPercent").value(70))
                .andExpect(jsonPath("$.data.maxBrands").value(4));
        assertThat(jdbc.queryForList("SELECT DISTINCT discount_percent FROM brand_vouchers WHERE campaign_id = ?::uuid",
                Integer.class, campaignId)).containsExactly(40);

        UUID brandC = testData.createApprovedBrand().getId();
        issue(admin, campaignId, brandC).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT discount_percent FROM brand_vouchers WHERE brand_id = ?",
                Integer.class, brandC)).isEqualTo(70);
    }

    @Test
    void quoteAppliesTheLargerOfTheRunningDiscountAndTheVoucher() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID voucherId = issueTo(brandIdOf(owner), 50).get(0);

        quote(owner, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.listPriceVnd").value(LIST_PRICE))
                .andExpect(jsonPath("$.data.source").value("NONE"))
                .andExpect(jsonPath("$.data.amountVnd").value(LIST_PRICE));
        quote(owner, voucherId)
                .andExpect(jsonPath("$.data.windowPercent").value(0))
                .andExpect(jsonPath("$.data.voucherPercent").value(50))
                .andExpect(jsonPath("$.data.appliedPercent").value(50))
                .andExpect(jsonPath("$.data.source").value("VOUCHER"))
                .andExpect(jsonPath("$.data.voucherApplied").value(true))
                .andExpect(jsonPath("$.data.voucherCode").value(matchesPattern(CODE_PATTERN)))
                .andExpect(jsonPath("$.data.amountVnd").value(499_500));

        setDiscount(20);
        quote(owner, voucherId)
                .andExpect(jsonPath("$.data.windowPercent").value(20))
                .andExpect(jsonPath("$.data.source").value("VOUCHER"))
                .andExpect(jsonPath("$.data.amountVnd").value(499_500));
        quote(owner, null)
                .andExpect(jsonPath("$.data.source").value("WINDOW"))
                .andExpect(jsonPath("$.data.amountVnd").value(799_200));

        setDiscount(50);
        quote(owner, voucherId)
                .andExpect(jsonPath("$.data.source").value("WINDOW"))
                .andExpect(jsonPath("$.data.voucherApplied").value(false))
                .andExpect(jsonPath("$.data.voucherIgnoredReason").value(containsString("giữ lại voucher")));

        setDiscount(60);
        quote(owner, voucherId)
                .andExpect(jsonPath("$.data.appliedPercent").value(60))
                .andExpect(jsonPath("$.data.source").value("WINDOW"))
                .andExpect(jsonPath("$.data.voucherApplied").value(false))
                .andExpect(jsonPath("$.data.amountVnd").value(399_600));
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");
    }

    @Test
    void checkoutWithVoucherReservesIt_blocksReuse_andMockConfirmationMarksItUsed() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID brandId = brandIdOf(owner);
        UUID voucherId = issueTo(brandId, 50).get(0);

        JsonNode checkout = data(checkout(owner, voucherId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.listPriceVnd").value(LIST_PRICE))
                .andExpect(jsonPath("$.data.discountPercentApplied").value(50))
                .andExpect(jsonPath("$.data.discountSource").value("VOUCHER"))
                .andExpect(jsonPath("$.data.amountVnd").value(499_500))
                .andExpect(jsonPath("$.data.voucherApplied").value(true))
                .andExpect(jsonPath("$.data.voucherId").value(voucherId.toString())));
        long orderCode = checkout.get("orderCode").asLong();
        UUID orderId = UUID.fromString(checkout.get("orderId").asText());

        assertThat(jdbc.queryForMap("SELECT voucher_id, discount_percent_applied, amount FROM brand_billing_orders "
                + "WHERE order_code = ?", orderCode))
                .containsEntry("voucher_id", voucherId)
                .containsEntry("discount_percent_applied", 50)
                .containsEntry("amount", 499_500L);
        assertThat(voucherStatus(voucherId)).isEqualTo("RESERVED");
        assertThat(jdbc.queryForObject("SELECT reserved_order_id FROM brand_vouchers WHERE id = ?", UUID.class,
                voucherId)).isEqualTo(orderId);

        checkout(owner, voucherId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_RESERVED"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_billing_orders WHERE voucher_id = ?", Long.class,
                voucherId)).isEqualTo(1);
        mockMvc.perform(get("/api/v1/brand/vouchers").with(user(owner)))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].status".formatted(voucherId)).value("RESERVED"))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].reservedOrderCode".formatted(voucherId)).value(orderCode));

        mockMvc.perform(get("/api/v1/brand/plan/orders/{code}", orderCode).with(user(owner)))
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.voucherCode").value(matchesPattern(CODE_PATTERN)));
        assertThat(jdbc.queryForMap("SELECT status, used_order_id, used_at IS NOT NULL AS used, reserved_order_id "
                + "FROM brand_vouchers WHERE id = ?", voucherId))
                .containsEntry("status", "USED")
                .containsEntry("used_order_id", orderId)
                .containsEntry("used", true)
                .containsEntry("reserved_order_id", null);
        assertThat(brandPlusService.isPlusActive(brandId)).isTrue();

        checkout(owner, voucherId)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_USED"));
        mockMvc.perform(get("/api/v1/brand/vouchers").with(user(owner)))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].status".formatted(voucherId)).value("USED"))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].usable".formatted(voucherId)).value(false));
    }

    @Test
    void parallelCheckoutsWithTheSameVoucherReserveItOnlyOnce() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID brandId = brandIdOf(owner);
        UUID voucherId = issueTo(brandId, 50).get(0);
        int attempts = 4;
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    try {
                        brandPlusService.checkout(brandId, owner.getUserId(), voucherId);
                        return true;
                    } catch (ConflictException ex) {
                        return false;
                    }
                }));
            }
            start.countDown();
            int succeeded = 0;
            for (Future<Boolean> result : results) {
                succeeded += result.get(30, TimeUnit.SECONDS) ? 1 : 0;
            }
            assertThat(succeeded).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(voucherStatus(voucherId)).isEqualTo("RESERVED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_billing_orders WHERE voucher_id = ?", Long.class,
                voucherId)).isEqualTo(1);
    }

    @Test
    void paidWebhookMarksTheReservedVoucherUsedOnce() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID voucherId = issueTo(brandIdOf(owner), 50).get(0);
        long orderCode = data(checkout(owner, voucherId).andExpect(status().isOk())).get("orderCode").asLong();

        assertThat(brandPlusService.handlePaid(orderCode, 499_500L)).isTrue();
        Timestamp usedAt = jdbc.queryForObject("SELECT used_at FROM brand_vouchers WHERE id = ?", Timestamp.class,
                voucherId);
        assertThat(voucherStatus(voucherId)).isEqualTo("USED");
        assertThat(brandPlusService.handlePaid(orderCode, 499_500L)).isTrue();
        assertThat(jdbc.queryForObject("SELECT used_at FROM brand_vouchers WHERE id = ?", Timestamp.class, voucherId))
                .isEqualTo(usedAt);
    }

    @Test
    void cancelledFailedOrExpiredOrdersGiveTheVoucherBack() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID voucherId = issueTo(brandIdOf(owner), 50).get(0);

        long cancelled = data(checkout(owner, voucherId).andExpect(status().isOk())).get("orderCode").asLong();
        mockMvc.perform(post("/api/v1/brand/plan/orders/{code}/cancel", cancelled).with(user(owner)))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");
        assertThat(jdbc.queryForObject("SELECT reserved_order_id FROM brand_vouchers WHERE id = ?", UUID.class,
                voucherId)).isNull();
        mockMvc.perform(post("/api/v1/brand/plan/orders/{code}/cancel", cancelled).with(user(owner)))
                .andExpect(status().isOk());
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");

        long failed = data(checkout(owner, voucherId).andExpect(status().isOk())).get("orderCode").asLong();
        assertThat(brandPlusService.handleUnpaid(failed)).isTrue();
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");

        long stale = data(checkout(owner, voucherId).andExpect(status().isOk())).get("orderCode").asLong();
        jdbc.update("UPDATE brand_billing_orders SET created_at = NOW() - INTERVAL '2 days' WHERE order_code = ?", stale);
        expiryJob.expireStalePendingOrders();
        assertThat(jdbc.queryForObject("SELECT status FROM brand_billing_orders WHERE order_code = ?", String.class,
                stale)).isEqualTo("EXPIRED");
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");

        long expiring = data(checkout(owner, voucherId).andExpect(status().isOk())).get("orderCode").asLong();
        jdbc.update("UPDATE brand_vouchers SET expires_at = ? WHERE id = ?",
                Timestamp.from(Instant.now().minus(1, ChronoUnit.MINUTES)), voucherId);
        mockMvc.perform(post("/api/v1/brand/plan/orders/{code}/cancel", expiring).with(user(owner)))
                .andExpect(status().isOk());
        assertThat(voucherStatus(voucherId)).isEqualTo("EXPIRED");
    }

    @Test
    void anotherBrandsVoucherIsNotFound() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        FitMeUserPrincipal other = brandOwner();
        UUID othersVoucher = issueTo(brandIdOf(other), 50).get(0);

        checkout(owner, othersVoucher).andExpect(status().isNotFound());
        quote(owner, othersVoucher).andExpect(status().isNotFound());
        checkout(owner, UUID.randomUUID()).andExpect(status().isNotFound());
        assertThat(voucherStatus(othersVoucher)).isEqualTo("ISSUED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM brand_billing_orders WHERE brand_id = ?", Long.class,
                brandIdOf(owner))).isZero();
    }

    @Test
    void biggerRunningDiscountWinsAndTheVoucherStaysIssued() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID voucherId = issueTo(brandIdOf(owner), 50).get(0);
        setDiscount(60);

        long orderCode = data(checkout(owner, voucherId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.discountPercentApplied").value(60))
                .andExpect(jsonPath("$.data.discountSource").value("WINDOW"))
                .andExpect(jsonPath("$.data.amountVnd").value(399_600))
                .andExpect(jsonPath("$.data.voucherApplied").value(false))
                .andExpect(jsonPath("$.data.voucherId").doesNotExist())
                .andExpect(jsonPath("$.data.voucherIgnoredReason").isNotEmpty())).get("orderCode").asLong();

        assertThat(jdbc.queryForObject("SELECT voucher_id FROM brand_billing_orders WHERE order_code = ?", UUID.class,
                orderCode)).isNull();
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");
        mockMvc.perform(get("/api/v1/brand/plan/orders/{code}", orderCode).with(user(owner)))
                .andExpect(jsonPath("$.data.status").value("PAID"));
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");
    }

    @Test
    void revokeOnlyWorksOnUnusedUnreservedVouchers() throws Exception {
        FitMeUserPrincipal admin = admin();
        FitMeUserPrincipal owner = brandOwner();
        List<UUID> vouchers = issueTo(brandIdOf(owner), 50);
        UUID issued = vouchers.get(0);
        UUID reserved = vouchers.get(1);
        UUID used = vouchers.get(2);

        revoke(admin, issued).andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("REVOKED"));
        assertThat(jdbc.queryForMap("SELECT status, revoked_at IS NOT NULL AS revoked, revoked_by FROM brand_vouchers "
                + "WHERE id = ?", issued))
                .containsEntry("status", "REVOKED")
                .containsEntry("revoked", true)
                .containsEntry("revoked_by", admin.getUserId());
        revoke(admin, issued).andExpect(status().isOk());
        checkout(owner, issued).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_REVOKED"));

        long pending = data(checkout(owner, reserved).andExpect(status().isOk())).get("orderCode").asLong();
        revoke(admin, reserved).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_RESERVED"))
                .andExpect(jsonPath("$.error").isNotEmpty());
        assertThat(voucherStatus(reserved)).isEqualTo("RESERVED");
        mockMvc.perform(post("/api/v1/brand/plan/orders/{code}/cancel", pending).with(user(owner)));

        long paid = data(checkout(owner, used).andExpect(status().isOk())).get("orderCode").asLong();
        brandPlusService.handlePaid(paid, null);
        revoke(admin, used).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_USED"));
        assertThat(voucherStatus(used)).isEqualTo("USED");

        revoke(admin, UUID.randomUUID()).andExpect(status().isNotFound());
    }

    @Test
    void expiredVoucherIsShownExpiredAndRejectedAtCheckout() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        UUID voucherId = issueTo(brandIdOf(owner), 50).get(0);
        jdbc.update("UPDATE brand_vouchers SET expires_at = ? WHERE id = ?",
                Timestamp.from(Instant.now().minus(1, ChronoUnit.HOURS)), voucherId);

        checkout(owner, voucherId).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_EXPIRED"));
        quote(owner, voucherId).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VOUCHER_EXPIRED"));
        mockMvc.perform(get("/api/v1/brand/vouchers").with(user(owner)))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].status".formatted(voucherId)).value("EXPIRED"))
                .andExpect(jsonPath("$.data[?(@.id == '%s')].usable".formatted(voucherId)).value(false));
        assertThat(voucherStatus(voucherId)).isEqualTo("EXPIRED");

        UUID other = issueTo(brandIdOf(owner), 50).get(0);
        jdbc.update("UPDATE brand_vouchers SET expires_at = ? WHERE id = ?",
                Timestamp.from(Instant.now().minus(1, ChronoUnit.HOURS)), other);
        assertThat(brandVoucherService.expireDue()).isGreaterThanOrEqualTo(1);
        assertThat(voucherStatus(other)).isEqualTo("EXPIRED");
    }

    @Test
    void campaignWindowEndBecomesTheVoucherExpiry() throws Exception {
        FitMeUserPrincipal admin = admin();
        Instant until = Instant.now().plus(10, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        String campaignId = createCampaign(admin, 25, 1, 1, until);
        FitMeUserPrincipal owner = brandOwner();
        issue(admin, campaignId, brandIdOf(owner)).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT expires_at FROM brand_vouchers WHERE campaign_id = ?::uuid",
                Timestamp.class, campaignId).toInstant()).isEqualTo(until);
        mockMvc.perform(get("/api/v1/brand/vouchers").with(user(owner)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].discountPercent").value(25))
                .andExpect(jsonPath("$.data[0].status").value("ISSUED"))
                .andExpect(jsonPath("$.data[0].usable").value(true))
                .andExpect(jsonPath("$.data[0].expiresAt").isNotEmpty())
                .andExpect(jsonPath("$.data[0].campaignName").isNotEmpty());
    }

    @Test
    void brandVoucherListOnlyShowsTheCallersVouchers() throws Exception {
        FitMeUserPrincipal ownerA = brandOwner();
        FitMeUserPrincipal ownerB = brandOwner();
        List<UUID> mine = issueTo(brandIdOf(ownerA), 50);
        List<UUID> theirs = issueTo(brandIdOf(ownerB), 50);

        JsonNode list = data(mockMvc.perform(get("/api/v1/brand/vouchers").with(user(ownerA)))
                .andExpect(status().isOk()));
        List<String> ids = list.findValuesAsText("id");
        assertThat(ids).containsExactlyInAnyOrderElementsOf(mine.stream().map(UUID::toString).toList());
        assertThat(ids).doesNotContainAnyElementsOf(theirs.stream().map(UUID::toString).toList());
    }

    @Test
    void onlyAdminsReachTheVoucherAdminApi_andOnlyBrandOwnersTheBrandApi() throws Exception {
        FitMeUserPrincipal owner = brandOwner();
        FitMeUserPrincipal consumer = new FitMeUserPrincipal(testData.createUser().user());
        FitMeUserPrincipal admin = admin();
        String campaignId = createCampaign(admin, 30, 1, 2, null);
        UUID voucherId = issueTo(brandIdOf(owner), 30).get(0);

        for (FitMeUserPrincipal outsider : List.of(owner, consumer)) {
            mockMvc.perform(get("/api/v1/admin/voucher-campaigns").with(user(outsider)))
                    .andExpect(status().isForbidden());
            campaignRequest(outsider, post("/api/v1/admin/voucher-campaigns"), 30, 1, 1, null, null)
                    .andExpect(status().isForbidden());
            issue(outsider, campaignId, brandIdOf(owner)).andExpect(status().isForbidden());
            mockMvc.perform(get("/api/v1/admin/voucher-campaigns/{id}/vouchers", campaignId).with(user(outsider)))
                    .andExpect(status().isForbidden());
            revoke(outsider, voucherId).andExpect(status().isForbidden());
        }
        mockMvc.perform(get("/api/v1/admin/voucher-campaigns")).andExpect(status().is4xxClientError());
        mockMvc.perform(get("/api/v1/brand/vouchers").with(user(admin))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/brand/vouchers").with(user(consumer))).andExpect(status().isForbidden());
        assertThat(voucherStatus(voucherId)).isEqualTo("ISSUED");
        assertThat(voucherCount(campaignId)).isZero();
    }

    /** Fresh campaign with one brand; returns that brand's voucher ids. */
    private List<UUID> issueTo(UUID brandId, int percent) throws Exception {
        FitMeUserPrincipal admin = admin();
        String campaignId = createCampaign(admin, percent, 3, 1, null);
        issue(admin, campaignId, brandId).andExpect(status().isOk());
        return jdbc.queryForList("SELECT id FROM brand_vouchers WHERE campaign_id = ?::uuid ORDER BY code",
                UUID.class, campaignId);
    }

    private String createCampaign(FitMeUserPrincipal admin, int percent, int perBrand, int maxBrands, Instant until)
            throws Exception {
        return data(campaignRequest(admin, post("/api/v1/admin/voucher-campaigns"), percent, perBrand, maxBrands,
                null, until).andExpect(status().isOk())).get("id").asText();
    }

    private ResultActions campaignRequest(FitMeUserPrincipal principal,
                                          MockHttpServletRequestBuilder request,
                                          int percent, int perBrand, int maxBrands, Instant from, Instant until)
            throws Exception {
        return mockMvc.perform(request
                .with(user(principal))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Test campaign %s","description":"Chiến dịch thử","discountPercent":%d,
                         "vouchersPerBrand":%d,"maxBrands":%d,"validFrom":%s,"validUntil":%s,"active":true}
                        """.formatted(UUID.randomUUID(), percent, perBrand, maxBrands, json(from), json(until))));
    }

    private ResultActions issue(FitMeUserPrincipal admin, String campaignId, UUID... brandIds) throws Exception {
        String ids = Arrays.stream(brandIds).map(id -> "\"" + id + "\"").collect(Collectors.joining(","));
        return mockMvc.perform(post("/api/v1/admin/voucher-campaigns/{id}/issue", campaignId)
                .with(user(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"brandIds\":[" + ids + "]}"));
    }

    private ResultActions revoke(FitMeUserPrincipal admin, UUID voucherId) throws Exception {
        return mockMvc.perform(post("/api/v1/admin/brand-vouchers/{id}/revoke", voucherId).with(user(admin)));
    }

    private ResultActions checkout(FitMeUserPrincipal owner, UUID voucherId) throws Exception {
        return mockMvc.perform(post("/api/v1/brand/plan/checkout")
                .with(user(owner))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"voucherId\":\"" + voucherId + "\"}"));
    }

    private ResultActions quote(FitMeUserPrincipal owner, UUID voucherId) throws Exception {
        var request = get("/api/v1/brand/plan/quote").with(user(owner));
        if (voucherId != null) {
            request.param("voucherId", voucherId.toString());
        }
        return mockMvc.perform(request);
    }

    private FitMeUserPrincipal admin() {
        return new FitMeUserPrincipal(testData.createAdmin().user());
    }

    private FitMeUserPrincipal brandOwner() {
        return new FitMeUserPrincipal(testData.createBrandOwner().user());
    }

    private UUID brandIdOf(FitMeUserPrincipal owner) {
        return jdbc.queryForObject("SELECT id FROM brands WHERE owner_user_id = ?", UUID.class, owner.getUserId());
    }

    private String voucherStatus(UUID voucherId) {
        return jdbc.queryForObject("SELECT status FROM brand_vouchers WHERE id = ?", String.class, voucherId);
    }

    private long voucherCount(String campaignId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM brand_vouchers WHERE campaign_id = ?::uuid", Long.class,
                campaignId);
    }

    private void setDiscount(int percent) {
        jdbc.update("UPDATE billing_plans SET discount_percent = ?, discount_starts_at = NULL, discount_ends_at = NULL "
                + "WHERE code = 'BRAND_PLUS'", percent);
    }

    private static String json(Instant instant) {
        return instant != null ? "\"" + instant + "\"" : "null";
    }

    private JsonNode data(ResultActions actions) throws Exception {
        return objectMapper.readTree(actions.andReturn().getResponse().getContentAsString()).get("data");
    }
}
