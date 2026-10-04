package com.fitme.fitken.dto;

import com.fitme.common.enums.FitkenEntryType;
import com.fitme.fitken.entity.FitkenLedgerEntry;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class FitkenLedgerItemDto {
    private UUID id;
    private FitkenEntryType entryType;
    private int delta;
    private int balanceAfter;
    private String note;
    private Instant createdAt;

    public static FitkenLedgerItemDto from(FitkenLedgerEntry entry) {
        return FitkenLedgerItemDto.builder()
                .id(entry.getId())
                .entryType(entry.getEntryType())
                .delta(entry.getDelta())
                .balanceAfter(entry.getBalanceAfter())
                .note(entry.getNote())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
