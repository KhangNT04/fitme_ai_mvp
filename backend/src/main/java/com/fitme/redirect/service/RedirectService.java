package com.fitme.redirect.service;

import com.fitme.analytics.service.AnalyticsService;
import com.fitme.common.enums.FlaggedLinkReason;
import com.fitme.common.enums.FlaggedLinkStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.product.entity.Product;
import com.fitme.product.service.ProductEligibilityService;
import com.fitme.product.service.ProductService;
import com.fitme.redirect.dto.BuyClickRequest;
import com.fitme.redirect.dto.BuyClickResponse;
import com.fitme.redirect.dto.FlaggedLinkResponse;
import com.fitme.redirect.entity.BuyClickEvent;
import com.fitme.redirect.entity.FlaggedLink;
import com.fitme.redirect.repository.BuyClickEventRepository;
import com.fitme.redirect.repository.FlaggedLinkRepository;
import com.fitme.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitme.common.util.UrlValidator;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RedirectService {

    private final ProductService productService;
    private final ProductEligibilityService eligibilityService;
    private final BuyClickEventRepository buyClickEventRepository;
    private final FlaggedLinkRepository flaggedLinkRepository;
    private final ProductRepository productRepository;
    private final AnalyticsService analyticsService;

    @Transactional
    public BuyClickResponse processBuyClick(BuyClickRequest request) {
        Product product = productService.getEntity(request.getProductId());
        if (!eligibilityService.canShowBuyButton(product)) {
            flagBrokenLink(product, FlaggedLinkReason.MISSING_URL);
            analyticsService.track("REDIRECT_FAILED", RequestContext.getCurrentUserId().orElse(null),
                    RequestContext.getSessionId().orElse(null), product.getBrandId(), product.getId(),
                    request.getRecommendationId(), request.getTryOnRequestId(), null);
            throw new BusinessException("Sản phẩm không khả dụng để mua");
        }

        String url = product.getPurchaseUrl().trim();
        if (!UrlValidator.isValidHttpUrl(url)) {
            flagBrokenLink(product, FlaggedLinkReason.BROKEN_URL);
            throw new BusinessException("Link mua hàng không hợp lệ");
        }

        BuyClickEvent event = BuyClickEvent.builder()
                .userId(RequestContext.getCurrentUserId().orElse(null))
                .sessionId(RequestContext.getSessionId().orElse(null))
                .productId(product.getId())
                .recommendationId(request.getRecommendationId())
                .tryOnRequestId(request.getTryOnRequestId())
                .selectedSize(request.getSelectedSize())
                .selectedColor(request.getSelectedColor())
                .sourcePage(request.getSourcePage())
                .purchaseUrl(url)
                .channel(product.getPurchaseChannel() != null ? product.getPurchaseChannel().name() : "OTHER")
                .build();
        event = buyClickEventRepository.save(event);

        analyticsService.track("BUY_CLICKED", event.getUserId(), event.getSessionId(),
                product.getBrandId(), product.getId(), request.getRecommendationId(),
                request.getTryOnRequestId(), null);

        return BuyClickResponse.builder()
                .eventId(event.getId())
                .redirectUrl(url)
                .channel(event.getChannel())
                .build();
    }

    public BuyClickResponse getEvent(UUID eventId) {
        BuyClickEvent event = buyClickEventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Sự kiện không tồn tại"));
        return BuyClickResponse.builder()
                .eventId(event.getId())
                .redirectUrl(event.getPurchaseUrl())
                .channel(event.getChannel())
                .build();
    }

    private void flagBrokenLink(Product product, FlaggedLinkReason reason) {
        flaggedLinkRepository.save(FlaggedLink.builder()
                .productId(product.getId())
                .purchaseUrl(product.getPurchaseUrl())
                .reason(reason)
                .status(FlaggedLinkStatus.OPEN)
                .build());
    }

    public List<FlaggedLinkResponse> listOpenFlaggedLinks() {
        return flaggedLinkRepository.findByStatus(FlaggedLinkStatus.OPEN).stream()
                .map(this::toFlaggedLinkResponse)
                .toList();
    }

    public FlaggedLinkResponse toFlaggedLinkResponse(FlaggedLink link) {
        String productName = productRepository.findById(link.getProductId())
                .map(Product::getName)
                .orElse("—");
        return FlaggedLinkResponse.builder()
                .id(link.getId())
                .productId(link.getProductId())
                .productName(productName)
                .url(link.getPurchaseUrl())
                .reason(link.getReason().name())
                .status(link.getStatus().name())
                .createdAt(link.getCreatedAt())
                .build();
    }
}
