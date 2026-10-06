package com.fitme.brandvoucher.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.brandplus.entity.BrandBillingOrder;
import com.fitme.brandplus.repository.BrandBillingOrderRepository;
import com.fitme.brandvoucher.dto.AdminBrandVoucherDto;
import com.fitme.brandvoucher.dto.IssueVouchersRequest;
import com.fitme.brandvoucher.dto.IssueVouchersResponse;
import com.fitme.brandvoucher.dto.VoucherCampaignDto;
import com.fitme.brandvoucher.dto.VoucherCampaignRequest;
import com.fitme.brandvoucher.entity.BrandVoucher;
import com.fitme.brandvoucher.entity.VoucherCampaign;
import com.fitme.brandvoucher.repository.BrandVoucherRepository;
import com.fitme.brandvoucher.repository.VoucherCampaignRepository;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.BrandVoucherStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.ConflictException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.time.AppClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Admin side of brand vouchers: campaigns, issuing codes to chosen brands and revoking unused codes. */
@Service
@RequiredArgsConstructor
@Slf4j
public class VoucherCampaignService {

    private static final int MAX_CODE_ATTEMPTS = 20;

    private final VoucherCampaignRepository campaignRepository;
    private final BrandVoucherRepository voucherRepository;
    private final BrandVoucherService brandVoucherService;
    private final BrandRepository brandRepository;
    private final BrandBillingOrderRepository orderRepository;
    private final BrandVoucherCodeGenerator codeGenerator;
    private final AppClock clock;

    @Transactional
    public List<VoucherCampaignDto> list() {
        Instant now = clock.now();
        brandVoucherService.expireIssuedBefore(now);
        Map<UUID, Map<BrandVoucherStatus, Long>> counts = statusCounts();
        Map<UUID, Long> brandCounts = brandCounts();
        return campaignRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(campaign -> toDto(campaign, counts.get(campaign.getId()), brandCounts.get(campaign.getId()), now))
                .toList();
    }

    @Transactional
    public VoucherCampaignDto get(UUID id) {
        Instant now = clock.now();
        brandVoucherService.expireIssuedBefore(now);
        return toDto(requireCampaign(id), now);
    }

    @Transactional
    public VoucherCampaignDto create(VoucherCampaignRequest request, UUID adminUserId) {
        validateWindow(request);
        VoucherCampaign campaign = VoucherCampaign.builder().createdBy(adminUserId).build();
        apply(campaign, request);
        return toDto(campaignRepository.save(campaign), clock.now());
    }

    /** Issued vouchers keep their own percent and expiry; edits only affect vouchers issued afterwards. */
    @Transactional
    public VoucherCampaignDto update(UUID id, VoucherCampaignRequest request) {
        VoucherCampaign campaign = campaignRepository.findByIdForUpdate(id).orElseThrow(VoucherCampaignService::notFound);
        validateWindow(request);
        int issuedBrands = voucherRepository.findBrandIdsByCampaignId(id).size();
        if (request.getMaxBrands() < issuedBrands) {
            throw new BusinessException("Số brand tối đa không được nhỏ hơn số brand đã nhận voucher (" + issuedBrands + ")");
        }
        apply(campaign, request);
        return toDto(campaignRepository.save(campaign), clock.now());
    }

    /**
     * Gives {@code vouchersPerBrand} codes to each brand. Brands that already got codes from this campaign are
     * skipped. The campaign row is locked so parallel calls cannot exceed {@code maxBrands}.
     */
    @Transactional
    public IssueVouchersResponse issue(UUID campaignId, IssueVouchersRequest request) {
        VoucherCampaign campaign = campaignRepository.findByIdForUpdate(campaignId)
                .orElseThrow(VoucherCampaignService::notFound);
        Instant now = clock.now();
        if (!campaign.isActive()) {
            throw new BusinessException("Chiến dịch đang tắt, không thể phát voucher", "VOUCHER_CAMPAIGN_INACTIVE");
        }
        if (campaign.isEndedAt(now)) {
            throw new BusinessException("Chiến dịch đã hết hạn, không thể phát voucher", "VOUCHER_CAMPAIGN_ENDED");
        }
        if (campaign.isNotStartedAt(now)) {
            throw new BusinessException("Chiến dịch chưa bắt đầu, chưa thể phát voucher", "VOUCHER_CAMPAIGN_NOT_STARTED");
        }

        Set<UUID> requested = new LinkedHashSet<>(request.getBrandIds().stream().filter(Objects::nonNull).toList());
        if (requested.isEmpty()) {
            throw new BusinessException("Chọn ít nhất một brand");
        }
        Map<UUID, Brand> brands = brandRepository.findAllById(requested).stream()
                .collect(Collectors.toMap(Brand::getId, Function.identity()));
        for (UUID brandId : requested) {
            Brand brand = brands.get(brandId);
            if (brand == null) {
                throw new NotFoundException("Brand không tồn tại: " + brandId);
            }
            if (brand.getStatus() != BrandStatus.APPROVED) {
                throw new BusinessException("Brand \"" + brand.getName() + "\" chưa được duyệt hoặc đang bị tạm ngưng",
                        "BRAND_NOT_APPROVED");
            }
        }

        Set<UUID> alreadyIssued = voucherRepository.findBrandIdsByCampaignId(campaignId);
        List<Brand> toIssue = requested.stream().filter(id -> !alreadyIssued.contains(id)).map(brands::get).toList();
        List<Brand> skipped = requested.stream().filter(alreadyIssued::contains).map(brands::get).toList();
        int remaining = campaign.getMaxBrands() - alreadyIssued.size();
        if (toIssue.size() > remaining) {
            throw new BusinessException("Chiến dịch chỉ phát cho tối đa " + campaign.getMaxBrands() + " brand (đã phát "
                    + alreadyIssued.size() + ", còn " + Math.max(remaining, 0) + " suất)", "VOUCHER_CAMPAIGN_FULL");
        }

        List<BrandVoucher> vouchers = new ArrayList<>();
        Set<String> batchCodes = new HashSet<>();
        for (Brand brand : toIssue) {
            for (int i = 0; i < campaign.getVouchersPerBrand(); i++) {
                vouchers.add(BrandVoucher.builder()
                        .campaignId(campaign.getId())
                        .brandId(brand.getId())
                        .code(uniqueCode(batchCodes))
                        .discountPercent(campaign.getDiscountPercent())
                        .status(BrandVoucherStatus.ISSUED)
                        .issuedAt(now)
                        .expiresAt(campaign.getValidUntil())
                        .build());
            }
        }
        voucherRepository.saveAll(vouchers);
        if (!vouchers.isEmpty()) {
            log.info("Voucher campaign {} issued {} voucher(s) to {} brand(s)", campaign.getId(), vouchers.size(),
                    toIssue.size());
        }
        return IssueVouchersResponse.builder()
                .issued(toIssue.stream().map(VoucherCampaignService::ref).toList())
                .skipped(skipped.stream().map(VoucherCampaignService::ref).toList())
                .vouchersIssued(vouchers.size())
                .campaign(toDto(campaign, now))
                .build();
    }

    @Transactional
    public List<AdminBrandVoucherDto> listVouchers(UUID campaignId) {
        requireCampaign(campaignId);
        Instant now = clock.now();
        brandVoucherService.expireIssuedBefore(now);
        List<BrandVoucher> vouchers = voucherRepository.findByCampaignIdOrderByIssuedAtDescCodeAsc(campaignId);
        Map<UUID, String> brandNames = brandRepository
                .findAllById(vouchers.stream().map(BrandVoucher::getBrandId).distinct().toList()).stream()
                .collect(Collectors.toMap(Brand::getId, Brand::getName));
        Map<UUID, Long> orderCodes = orderCodes(vouchers);
        return vouchers.stream().map(voucher -> toDto(voucher, brandNames, orderCodes, now)).toList();
    }

    /** Only an unused, unreserved voucher can be revoked; revoking twice is a no-op. */
    @Transactional
    public AdminBrandVoucherDto revoke(UUID voucherId, UUID adminUserId) {
        BrandVoucher voucher = voucherRepository.findByIdForUpdate(voucherId)
                .orElseThrow(() -> new NotFoundException("Voucher không tồn tại"));
        Instant now = clock.now();
        switch (voucher.getStatus()) {
            case ISSUED -> {
                voucher.setStatus(BrandVoucherStatus.REVOKED);
                voucher.setRevokedAt(now);
                voucher.setRevokedBy(adminUserId);
                voucherRepository.save(voucher);
            }
            case REVOKED -> {
            }
            case RESERVED -> throw new ConflictException(
                    "Voucher đang được giữ cho một đơn thanh toán chưa hoàn tất, chưa thể thu hồi", "VOUCHER_RESERVED");
            case USED -> throw new ConflictException("Voucher đã được sử dụng, không thể thu hồi", "VOUCHER_USED");
            case EXPIRED -> throw new ConflictException("Voucher đã hết hạn, không cần thu hồi", "VOUCHER_EXPIRED");
        }
        Map<UUID, String> brandNames = brandRepository.findById(voucher.getBrandId())
                .map(brand -> Map.of(brand.getId(), brand.getName()))
                .orElse(Map.of());
        return toDto(voucher, brandNames, orderCodes(List.of(voucher)), now);
    }

    private String uniqueCode(Set<String> batchCodes) {
        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = codeGenerator.next();
            if (!batchCodes.contains(code) && !voucherRepository.existsByCode(code)) {
                batchCodes.add(code);
                return code;
            }
        }
        throw new IllegalStateException("Could not generate a unique voucher code");
    }

    private VoucherCampaign requireCampaign(UUID id) {
        return campaignRepository.findById(id).orElseThrow(VoucherCampaignService::notFound);
    }

    private static void validateWindow(VoucherCampaignRequest request) {
        if (request.getValidFrom() != null && request.getValidUntil() != null
                && !request.getValidUntil().isAfter(request.getValidFrom())) {
            throw new BusinessException("Thời điểm kết thúc phải sau thời điểm bắt đầu");
        }
    }

    private static void apply(VoucherCampaign campaign, VoucherCampaignRequest request) {
        campaign.setName(request.getName().trim());
        campaign.setDescription(request.getDescription() != null && !request.getDescription().isBlank()
                ? request.getDescription().trim()
                : null);
        campaign.setDiscountPercent(request.getDiscountPercent());
        campaign.setVouchersPerBrand(request.getVouchersPerBrand());
        campaign.setMaxBrands(request.getMaxBrands());
        campaign.setValidFrom(request.getValidFrom());
        campaign.setValidUntil(request.getValidUntil());
        campaign.setActive(request.isActive());
    }

    private Map<UUID, Map<BrandVoucherStatus, Long>> statusCounts() {
        Map<UUID, Map<BrandVoucherStatus, Long>> counts = new HashMap<>();
        for (Object[] row : voucherRepository.countByCampaignAndStatus()) {
            counts.computeIfAbsent((UUID) row[0], id -> new EnumMap<>(BrandVoucherStatus.class))
                    .put((BrandVoucherStatus) row[1], ((Number) row[2]).longValue());
        }
        return counts;
    }

    private Map<UUID, Long> brandCounts() {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : voucherRepository.countBrandsByCampaign()) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private Map<UUID, Long> orderCodes(List<BrandVoucher> vouchers) {
        List<UUID> orderIds = vouchers.stream()
                .flatMap(v -> Stream.of(v.getReservedOrderId(), v.getUsedOrderId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return orderRepository.findAllById(orderIds).stream()
                .collect(Collectors.toMap(BrandBillingOrder::getId, BrandBillingOrder::getOrderCode));
    }

    private VoucherCampaignDto toDto(VoucherCampaign campaign, Instant now) {
        return toDto(campaign, statusCounts().get(campaign.getId()), brandCounts().get(campaign.getId()), now);
    }

    private static VoucherCampaignDto toDto(VoucherCampaign campaign, Map<BrandVoucherStatus, Long> counts,
                                            Long brandCount, Instant now) {
        Map<BrandVoucherStatus, Long> byStatus = new EnumMap<>(BrandVoucherStatus.class);
        for (BrandVoucherStatus status : BrandVoucherStatus.values()) {
            byStatus.put(status, counts != null ? counts.getOrDefault(status, 0L) : 0L);
        }
        return VoucherCampaignDto.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .description(campaign.getDescription())
                .discountPercent(campaign.getDiscountPercent())
                .vouchersPerBrand(campaign.getVouchersPerBrand())
                .maxBrands(campaign.getMaxBrands())
                .validFrom(campaign.getValidFrom())
                .validUntil(campaign.getValidUntil())
                .active(campaign.isActive())
                .ended(campaign.isEndedAt(now))
                .createdAt(campaign.getCreatedAt())
                .updatedAt(campaign.getUpdatedAt())
                .issuedBrandCount(brandCount != null ? brandCount : 0)
                .voucherCount(byStatus.values().stream().mapToLong(Long::longValue).sum())
                .voucherCountsByStatus(byStatus)
                .build();
    }

    private static AdminBrandVoucherDto toDto(BrandVoucher voucher, Map<UUID, String> brandNames,
                                              Map<UUID, Long> orderCodes, Instant now) {
        return AdminBrandVoucherDto.builder()
                .id(voucher.getId())
                .campaignId(voucher.getCampaignId())
                .brandId(voucher.getBrandId())
                .brandName(brandNames.get(voucher.getBrandId()))
                .code(voucher.getCode())
                .discountPercent(voucher.getDiscountPercent())
                .status(voucher.effectiveStatus(now))
                .issuedAt(voucher.getIssuedAt())
                .expiresAt(voucher.getExpiresAt())
                .reservedOrderCode(voucher.getReservedOrderId() != null ? orderCodes.get(voucher.getReservedOrderId()) : null)
                .usedOrderCode(voucher.getUsedOrderId() != null ? orderCodes.get(voucher.getUsedOrderId()) : null)
                .usedAt(voucher.getUsedAt())
                .revokedAt(voucher.getRevokedAt())
                .build();
    }

    private static IssueVouchersResponse.BrandRef ref(Brand brand) {
        return new IssueVouchersResponse.BrandRef(brand.getId(), brand.getName());
    }

    private static NotFoundException notFound() {
        return new NotFoundException("Chiến dịch voucher không tồn tại");
    }
}
