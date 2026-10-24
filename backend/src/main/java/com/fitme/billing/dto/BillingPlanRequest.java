package com.fitme.billing.dto;

import com.fitme.common.enums.BillingPlanType;
import com.fitme.common.enums.PlanAudience;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.Instant;

@Data
public class BillingPlanRequest {
    @NotBlank
    private String code;
    @NotBlank
    private String name;
    private BillingPlanType planType = BillingPlanType.SUBSCRIPTION;
    /** Set on create (default CONSUMER); cannot change on update. */
    private PlanAudience audience;
    @Min(1)
    private long priceVnd;
    /** Required (>= 1) for consumer plans; brand plans grant no Fitken. */
    @Min(0)
    private int fitkenAmount;
    private Integer billingPeriodDays;
    private boolean active = true;
    /**
     * Shown on the public pricing page (admin toggle); buying is governed by {@code active}.
     * Null keeps the current value on update (so an old client cannot silently un-hide a plan).
     */
    private Boolean visible;
    private int sortOrder;
    @Min(value = 0, message = "Phần trăm giảm giá phải từ 0 đến 100")
    @Max(value = 100, message = "Phần trăm giảm giá phải từ 0 đến 100")
    private Integer discountPercent;
    private Instant discountStartsAt;
    private Instant discountEndsAt;
}
