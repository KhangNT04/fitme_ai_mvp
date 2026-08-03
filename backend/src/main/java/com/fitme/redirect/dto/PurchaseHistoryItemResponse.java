package com.fitme.redirect.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PurchaseHistoryItemResponse {
    private UUID eventId;
    private UUID productId;
    private String productName;
    private String brandName;
    private BigDecimal price;
    private String currency;
    private String purchaseUrl;
    private String channel;
    private String selectedSize;
    private String selectedColor;
    private boolean purchasedConfirmed;
    private Instant purchasedConfirmedAt;
    private Instant clickedAt;
}
