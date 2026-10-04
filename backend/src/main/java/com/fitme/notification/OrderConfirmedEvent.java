package com.fitme.notification;

import java.util.UUID;

/** A commerce order became CONFIRMED: placed with COD, or paid online via PayOS. */
public record OrderConfirmedEvent(UUID orderId, boolean paidOnline) {
}
