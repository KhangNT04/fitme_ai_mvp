package com.fitme.redirect.service;

import com.fitme.brand.entity.Brand;
import com.fitme.brand.repository.BrandRepository;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.OwnershipChecker;
import com.fitme.common.security.RequestContext;
import com.fitme.product.entity.Product;
import com.fitme.product.repository.ProductRepository;
import com.fitme.redirect.dto.PurchaseHistoryItemResponse;
import com.fitme.redirect.dto.PurchaseHistoryResponse;
import com.fitme.redirect.entity.BuyClickEvent;
import com.fitme.redirect.repository.BuyClickEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseHistoryService {

    private final BuyClickEventRepository buyClickEventRepository;
    private final ProductRepository productRepository;
    private final BrandRepository brandRepository;

    public PurchaseHistoryResponse listForCurrentUser() {
        List<BuyClickEvent> events = loadOwnedEvents();
        events.sort(Comparator.comparing(BuyClickEvent::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        Map<UUID, Product> products = new LinkedHashMap<>();
        Map<UUID, String> brandNames = new LinkedHashMap<>();
        List<PurchaseHistoryItemResponse> items = new ArrayList<>();
        BigDecimal spend = BigDecimal.ZERO;
        long purchased = 0;

        for (BuyClickEvent event : events) {
            Product product = products.computeIfAbsent(event.getProductId(),
                    id -> productRepository.findById(id).orElse(null));
            String brandName = null;
            BigDecimal price = null;
            String currency = "VND";
            String productName = "Sản phẩm";
            if (product != null) {
                productName = product.getName();
                price = product.getPrice();
                currency = product.getCurrency() != null ? product.getCurrency() : "VND";
                if (product.getBrandId() != null) {
                    brandName = brandNames.computeIfAbsent(product.getBrandId(),
                            id -> brandRepository.findById(id).map(Brand::getName).orElse(null));
                }
            }
            if (event.isPurchasedConfirmed()) {
                purchased++;
                if (price != null) {
                    spend = spend.add(price);
                }
            }
            items.add(PurchaseHistoryItemResponse.builder()
                    .eventId(event.getId())
                    .productId(event.getProductId())
                    .productName(productName)
                    .brandName(brandName)
                    .price(price)
                    .currency(currency)
                    .purchaseUrl(event.getPurchaseUrl())
                    .channel(event.getChannel())
                    .selectedSize(event.getSelectedSize())
                    .selectedColor(event.getSelectedColor())
                    .purchasedConfirmed(event.isPurchasedConfirmed())
                    .purchasedConfirmedAt(event.getPurchasedConfirmedAt())
                    .clickedAt(event.getCreatedAt())
                    .build());
        }

        return PurchaseHistoryResponse.builder()
                .clickCount(items.size())
                .purchasedCount(purchased)
                .estimatedSpend(spend)
                .items(items)
                .build();
    }

    @Transactional
    public PurchaseHistoryItemResponse confirmPurchase(UUID eventId, boolean purchased) {
        BuyClickEvent event = buyClickEventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Sự kiện không tồn tại"));
        OwnershipChecker.verify(event.getUserId(), event.getSessionId());
        event.setPurchasedConfirmed(purchased);
        event.setPurchasedConfirmedAt(purchased ? Instant.now() : null);
        buyClickEventRepository.save(event);
        return listForCurrentUser().getItems().stream()
                .filter(i -> eventId.equals(i.getEventId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException("Không đọc lại được lịch sử mua"));
    }

    private List<BuyClickEvent> loadOwnedEvents() {
        UUID userId = RequestContext.getCurrentUserId().orElse(null);
        UUID sessionId = RequestContext.getSessionId().orElse(null);
        if (userId == null && sessionId == null) {
            throw new BusinessException("Yêu cầu đăng nhập hoặc session ẩn danh");
        }
        LinkedHashMap<UUID, BuyClickEvent> merged = new LinkedHashMap<>();
        if (userId != null) {
            buyClickEventRepository.findByUserId(userId).forEach(e -> merged.put(e.getId(), e));
        }
        if (sessionId != null) {
            buyClickEventRepository.findBySessionId(sessionId).forEach(e -> merged.putIfAbsent(e.getId(), e));
        }
        return new ArrayList<>(merged.values());
    }
}
