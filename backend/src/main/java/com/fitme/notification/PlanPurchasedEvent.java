package com.fitme.notification;

import java.util.UUID;

/** A consumer billing order (Premium subscription or Fitken top-up) was paid. */
public record PlanPurchasedEvent(UUID billingOrderId) {
}
