package com.fitme.brandlead.service;

import com.fitme.brandlead.dto.BrandLeadDto;
import com.fitme.brandlead.dto.BrandLeadPage;
import com.fitme.brandlead.dto.BrandLeadSummary;
import com.fitme.brandplus.service.BrandPlusService;
import com.fitme.common.enums.ConsentType;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.exception.PlusRequiredException;
import com.fitme.common.time.AppClock;
import com.fitme.privacy.entity.ConsentRecord;
import com.fitme.privacy.repository.ConsentRecordRepository;
import com.fitme.product.entity.Product;
import com.fitme.redirect.entity.BuyClickEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Leads: signed-in customers who opted in to BRAND_LEAD_SHARING and clicked buy on a brand's product.
 * Leads are stored for every brand; customer details are only shown to Brand Plus brands, and only while the
 * customer's latest consent decision is still a grant.
 */
@Service
@RequiredArgsConstructor
public class BrandLeadService {

    static final int DEFAULT_PAGE_SIZE = 20;
    static final int MAX_PAGE_SIZE = 100;
    static final String PLUS_REQUIRED_MESSAGE =
            "Xem và xác nhận khách quan tâm là quyền lợi của FitMe Brand Plus. Nâng cấp để sử dụng.";

    private static final String LATEST_CONSENT = """
            COALESCE((SELECT c.accepted FROM consent_records c
                      WHERE c.user_id = l.user_id AND c.consent_type = 'BRAND_LEAD_SHARING'
                      ORDER BY c.created_at DESC LIMIT 1), FALSE)
            """;
    private static final String ROW_SELECT = """
            SELECT l.id, l.product_id, p.name AS product_name, l.size, l.color, l.created_at, l.confirmed_sold_at,
                   u.id AS customer_id, u.display_name, u.email,
            """ + LATEST_CONSENT + """
             AS consented
            FROM brand_leads l
            JOIN products p ON p.id = l.product_id
            LEFT JOIN user_accounts u ON u.id = l.user_id AND u.status <> 'DELETED'
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final ConsentRecordRepository consentRepository;
    private final BrandPlusService brandPlusService;
    private final AppClock clock;

    /** Called for every recorded buy click; repeat clicks on the same product and business day keep one lead. */
    @Transactional
    public void recordLead(BuyClickEvent event, Product product) {
        if (event.getUserId() == null || !hasLeadSharingConsent(event.getUserId())) {
            return;
        }
        jdbc.update("""
                INSERT INTO brand_leads (brand_id, product_id, user_id, buy_click_event_id, size, color, lead_date)
                VALUES (:brand, :product, :user, :event, :size, :color, :day)
                ON CONFLICT (user_id, product_id, lead_date) DO NOTHING
                """, new MapSqlParameterSource()
                .addValue("brand", product.getBrandId(), Types.OTHER)
                .addValue("product", product.getId(), Types.OTHER)
                .addValue("user", event.getUserId(), Types.OTHER)
                .addValue("event", event.getId(), Types.OTHER)
                .addValue("size", blankToNull(event.getSelectedSize()))
                .addValue("color", blankToNull(event.getSelectedColor()))
                .addValue("day", clock.today()));
    }

    public boolean hasLeadSharingConsent(UUID userId) {
        return consentRepository
                .findFirstByUserIdAndConsentTypeOrderByCreatedAtDesc(userId, ConsentType.BRAND_LEAD_SHARING)
                .map(ConsentRecord::isAccepted)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public BrandLeadPage list(UUID brandId, LocalDate from, LocalDate to, UUID productId, Boolean sold,
                              int page, int size) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessException("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }
        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);
        BrandLeadSummary summary = summary(brandId);
        if (!brandPlusService.isPlusActive(brandId)) {
            return new BrandLeadPage(true, summary, List.of(), 0, safeSize, 0, 0);
        }

        MapSqlParameterSource params = new MapSqlParameterSource().addValue("brand", brandId, Types.OTHER);
        List<String> where = new ArrayList<>(List.of("l.brand_id = :brand"));
        if (from != null) {
            where.add("l.created_at >= :from");
            params.addValue("from", utc(clock.startOfDay(from)));
        }
        if (to != null) {
            where.add("l.created_at < :to");
            params.addValue("to", utc(clock.startOfDay(to.plusDays(1))));
        }
        if (productId != null) {
            where.add("l.product_id = :product");
            params.addValue("product", productId, Types.OTHER);
        }
        if (sold != null) {
            where.add(sold ? "l.confirmed_sold_at IS NOT NULL" : "l.confirmed_sold_at IS NULL");
        }
        String whereSql = " WHERE " + String.join(" AND ", where);

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM brand_leads l" + whereSql, params, Long.class);
        long totalItems = total == null ? 0 : total;
        params.addValue("limit", safeSize).addValue("offset", (long) safePage * safeSize);
        List<BrandLeadDto> items = jdbc.query(ROW_SELECT + whereSql
                + " ORDER BY l.created_at DESC, l.id LIMIT :limit OFFSET :offset", params, ROW_MAPPER);
        int totalPages = (int) ((totalItems + safeSize - 1) / safeSize);
        return new BrandLeadPage(false, summary, items, safePage, safeSize, totalItems, totalPages);
    }

    /**
     * Ticking sets {@code confirmed_sold_at} once (re-ticking keeps the first confirmation); unticking clears it.
     * A sold lead of a still-linked customer counts as a purchase for the review badge (see PurchaseVerifier).
     */
    @Transactional
    public BrandLeadDto markSold(UUID brandId, UUID confirmedBy, UUID leadId, boolean sold) {
        if (!brandPlusService.isPlusActive(brandId)) {
            throw new PlusRequiredException(PLUS_REQUIRED_MESSAGE);
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("id", leadId, Types.OTHER)
                .addValue("brand", brandId, Types.OTHER)
                .addValue("by", confirmedBy, Types.OTHER)
                .addValue("now", utc(clock.now()));
        int updated = jdbc.update(sold
                ? """
                  UPDATE brand_leads
                  SET confirmed_sold_at = COALESCE(confirmed_sold_at, :now),
                      confirmed_by = CASE WHEN confirmed_sold_at IS NULL THEN :by ELSE confirmed_by END
                  WHERE id = :id AND brand_id = :brand
                  """
                : "UPDATE brand_leads SET confirmed_sold_at = NULL, confirmed_by = NULL WHERE id = :id AND brand_id = :brand",
                params);
        if (updated == 0) {
            throw new NotFoundException("Khách quan tâm không tồn tại");
        }
        return jdbc.queryForObject(ROW_SELECT + " WHERE l.id = :id AND l.brand_id = :brand", params, ROW_MAPPER);
    }

    private BrandLeadSummary summary(UUID brandId) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE confirmed_sold_at IS NOT NULL) AS sold,
                       COUNT(*) FILTER (WHERE created_at >= :since) AS recent
                FROM brand_leads WHERE brand_id = :brand
                """, new MapSqlParameterSource()
                .addValue("brand", brandId, Types.OTHER)
                .addValue("since", utc(clock.now().minus(30, ChronoUnit.DAYS))),
                (rs, i) -> new BrandLeadSummary(rs.getLong("total"), rs.getLong("sold"), rs.getLong("recent")));
    }

    private static final RowMapper<BrandLeadDto> ROW_MAPPER = (rs, i) -> {
        BrandLeadDto.CustomerStatus status = rs.getObject("customer_id", UUID.class) == null
                ? BrandLeadDto.CustomerStatus.ANONYMIZED
                : rs.getBoolean("consented") ? BrandLeadDto.CustomerStatus.VISIBLE : BrandLeadDto.CustomerStatus.WITHDRAWN;
        boolean visible = status == BrandLeadDto.CustomerStatus.VISIBLE;
        return new BrandLeadDto(
                rs.getObject("id", UUID.class),
                rs.getObject("product_id", UUID.class),
                rs.getString("product_name"),
                visible ? blankToNull(rs.getString("display_name")) : null,
                visible ? rs.getString("email") : null,
                status,
                rs.getString("size"),
                rs.getString("color"),
                instant(rs, "created_at"),
                instant(rs, "confirmed_sold_at"));
    };

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }

    private static OffsetDateTime utc(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
