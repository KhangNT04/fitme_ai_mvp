package com.fitme.redirect.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class BuyClickResponse {
    private UUID eventId;
    private String redirectUrl;
    private String channel;
}
