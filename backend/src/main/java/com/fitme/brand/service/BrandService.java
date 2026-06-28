package com.fitme.brand.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.brand.dto.BrandApplicationResponse;
import com.fitme.brand.dto.BrandOnboardingRequest;
import com.fitme.brand.dto.BrandResponse;
import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.enums.BrandStatus;
import com.fitme.common.enums.UserRole;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository brandRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional
    public BrandResponse applyForBrand(UUID userId, BrandOnboardingRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Tài khoản không tồn tại"));
        if (user.getRole() != UserRole.USER) {
            throw new BusinessException("Chỉ tài khoản người dùng mới có thể đăng ký brand");
        }
        List<Brand> existing = brandRepository.findByOwnerUserId(userId);
        if (!existing.isEmpty()) {
            Brand existingBrand = existing.getFirst();
            if (existingBrand.getStatus() == BrandStatus.REJECTED) {
                existingBrand.setName(request.getName());
                existingBrand.setDescription(request.getDescription());
                existingBrand.setWebsiteUrl(request.getWebsiteUrl());
                existingBrand.setShopeeUrl(request.getShopeeUrl());
                existingBrand.setTiktokShopUrl(request.getTiktokShopUrl());
                existingBrand.setInstagramUrl(request.getInstagramUrl());
                existingBrand.setFacebookUrl(request.getFacebookUrl());
                existingBrand.setContactEmail(request.getContactEmail() != null ? request.getContactEmail() : user.getEmail());
                existingBrand.setContactPhone(request.getContactPhone());
                existingBrand.setStatus(BrandStatus.PENDING);
                return toResponse(brandRepository.save(existingBrand));
            }
            throw new BusinessException("Bạn đã gửi đơn đăng ký brand");
        }
        Brand brand = Brand.builder()
                .ownerUserId(userId)
                .name(request.getName())
                .description(request.getDescription())
                .logoUrl(request.getLogoUrl())
                .websiteUrl(request.getWebsiteUrl())
                .shopeeUrl(request.getShopeeUrl())
                .tiktokShopUrl(request.getTiktokShopUrl())
                .instagramUrl(request.getInstagramUrl())
                .facebookUrl(request.getFacebookUrl())
                .contactEmail(request.getContactEmail() != null ? request.getContactEmail() : user.getEmail())
                .contactPhone(request.getContactPhone())
                .status(BrandStatus.PENDING)
                .build();
        return toResponse(brandRepository.save(brand));
    }

    public BrandApplicationResponse getMyApplication(UUID userId) {
        return brandRepository.findByOwnerUserId(userId).stream()
                .findFirst()
                .map(brand -> BrandApplicationResponse.builder()
                        .brand(toResponse(brand))
                        .hasApplication(true)
                        .message(statusMessage(brand.getStatus()))
                        .build())
                .orElse(BrandApplicationResponse.builder()
                        .hasApplication(false)
                        .message("Chưa có đơn đăng ký brand")
                        .build());
    }

    @Transactional
    public BrandResponse onboard(UUID ownerUserId, BrandOnboardingRequest request) {
        List<Brand> existing = brandRepository.findByOwnerUserId(ownerUserId);
        if (!existing.isEmpty()) {
            throw new BusinessException("Bạn đã có brand đăng ký");
        }
        Brand brand = Brand.builder()
                .ownerUserId(ownerUserId)
                .name(request.getName())
                .description(request.getDescription())
                .logoUrl(request.getLogoUrl())
                .websiteUrl(request.getWebsiteUrl())
                .shopeeUrl(request.getShopeeUrl())
                .tiktokShopUrl(request.getTiktokShopUrl())
                .instagramUrl(request.getInstagramUrl())
                .facebookUrl(request.getFacebookUrl())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .status(BrandStatus.PENDING)
                .build();
        return toResponse(brandRepository.save(brand));
    }

    public BrandResponse getMyBrand(UUID ownerUserId) {
        return toResponse(getBrandForOwner(ownerUserId));
    }

    @Transactional
    public BrandResponse updateMyBrand(UUID ownerUserId, BrandOnboardingRequest request) {
        Brand brand = getBrandForOwner(ownerUserId);
        brand.setName(request.getName());
        brand.setDescription(request.getDescription());
        brand.setLogoUrl(request.getLogoUrl());
        brand.setWebsiteUrl(request.getWebsiteUrl());
        brand.setShopeeUrl(request.getShopeeUrl());
        brand.setTiktokShopUrl(request.getTiktokShopUrl());
        brand.setInstagramUrl(request.getInstagramUrl());
        brand.setFacebookUrl(request.getFacebookUrl());
        brand.setContactEmail(request.getContactEmail());
        brand.setContactPhone(request.getContactPhone());
        return toResponse(brandRepository.save(brand));
    }

    public Brand getBrandForOwner(UUID ownerUserId) {
        Brand brand = brandRepository.findByOwnerUserId(ownerUserId).stream()
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Chưa có brand"));
        if (brand.getStatus() != BrandStatus.APPROVED) {
            throw new BusinessException("Brand chưa được duyệt. Trạng thái: " + brand.getStatus().name());
        }
        return brand;
    }

    public Brand getBrandEntityForOwner(UUID ownerUserId) {
        return brandRepository.findByOwnerUserId(ownerUserId).stream()
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Chưa có brand"));
    }

    public List<BrandResponse> listPublicBrands() {
        return brandRepository.findByStatus(BrandStatus.APPROVED).stream()
                .map(this::toResponse)
                .toList();
    }

    public BrandResponse getPublicBrand(UUID id) {
        Brand brand = brandRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Brand không tồn tại"));
        if (brand.getStatus() != BrandStatus.APPROVED) {
            throw new NotFoundException("Brand không khả dụng");
        }
        return toResponse(brand);
    }

    public List<BrandResponse> listAllBrands() {
        return brandRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public BrandResponse approveBrand(UUID id) {
        Brand brand = brandRepository.findById(id).orElseThrow(() -> new NotFoundException("Brand không tồn tại"));
        brand.setStatus(BrandStatus.APPROVED);
        if (brand.getOwnerUserId() != null) {
            UserAccount owner = userAccountRepository.findById(brand.getOwnerUserId())
                    .orElseThrow(() -> new NotFoundException("Chủ brand không tồn tại"));
            owner.setRole(UserRole.BRAND_OWNER);
            userAccountRepository.save(owner);
        }
        return toResponse(brandRepository.save(brand));
    }

    @Transactional
    public BrandResponse rejectBrand(UUID id) {
        Brand brand = brandRepository.findById(id).orElseThrow(() -> new NotFoundException("Brand không tồn tại"));
        brand.setStatus(BrandStatus.REJECTED);
        return toResponse(brandRepository.save(brand));
    }

    @Transactional
    public BrandResponse suspendBrand(UUID id) {
        Brand brand = brandRepository.findById(id).orElseThrow(() -> new NotFoundException("Brand không tồn tại"));
        brand.setStatus(BrandStatus.SUSPENDED);
        return toResponse(brandRepository.save(brand));
    }

    private String statusMessage(BrandStatus status) {
        return switch (status) {
            case PENDING -> "Đơn đăng ký đang chờ admin duyệt";
            case APPROVED -> "Brand đã được duyệt. Vui lòng đăng nhập lại để truy cập portal.";
            case REJECTED -> "Đơn đăng ký đã bị từ chối";
            case SUSPENDED -> "Brand đã bị tạm ngưng";
        };
    }

    private BrandResponse toResponse(Brand brand) {
        return BrandResponse.builder()
                .id(brand.getId())
                .name(brand.getName())
                .description(brand.getDescription())
                .logoUrl(brand.getLogoUrl())
                .websiteUrl(brand.getWebsiteUrl())
                .shopeeUrl(brand.getShopeeUrl())
                .tiktokShopUrl(brand.getTiktokShopUrl())
                .instagramUrl(brand.getInstagramUrl())
                .facebookUrl(brand.getFacebookUrl())
                .contactEmail(brand.getContactEmail())
                .contactPhone(brand.getContactPhone())
                .status(brand.getStatus().name())
                .createdAt(brand.getCreatedAt())
                .build();
    }
}
