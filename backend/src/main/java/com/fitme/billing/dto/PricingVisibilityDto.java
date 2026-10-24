package com.fitme.billing.dto;

/**
 * Public flags the consumer frontend uses to decide what to show.
 *
 * @param showPaid false when the admin hid the paid consumer plans; the pricing page, the upgrade
 *                 buttons and the upsell banners must not be rendered then.
 */
public record PricingVisibilityDto(boolean showPaid) {
}
