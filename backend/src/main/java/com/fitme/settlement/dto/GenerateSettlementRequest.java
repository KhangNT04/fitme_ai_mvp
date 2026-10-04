package com.fitme.settlement.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class GenerateSettlementRequest {
    /** Null = every brand with eligible orders. */
    private UUID brandId;
}
