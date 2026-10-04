package com.fitme.order.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fitme.common.enums.OrderStatus;
import com.fitme.common.enums.PaymentMethod;
import com.fitme.common.enums.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class OrderSummaryDto {
    private UUID id;
    private String orderCode;
    private OrderStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private long totalVnd;
    private int itemCount;
    private String firstItemImageUrl;
    private Instant createdAt;
    /** Admin list only: account name/email and the order's contact phone. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String buyerName;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String buyerEmail;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String buyerPhone;
}
