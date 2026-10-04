package com.fitme.order.dto;

import com.fitme.cart.dto.CartItemDto;
import com.fitme.common.enums.VoucherType;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OrderPreviewDto {
    private long subtotalVnd;
    private long shippingFeeVnd;
    private long discountVnd;
    private long totalVnd;
    /** Applied voucher, or null. */
    private Voucher voucher;
    private List<Group> groups;

    @Data
    @Builder
    public static class Voucher {
        private UUID id;
        private VoucherType voucherType;
        private long maxDiscountVnd;
    }

    @Data
    @Builder
    public static class Group {
        private UUID brandId;
        private String brandName;
        private long subtotalVnd;
        private long shippingFeeVnd;
        private List<CartItemDto> items;
    }
}
