package com.fitme.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class OccasionRuleDto {
    private UUID id;
    private String name;
    private String description;
    private List<String> keywords;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
