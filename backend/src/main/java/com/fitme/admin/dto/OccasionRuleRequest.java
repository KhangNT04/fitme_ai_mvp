package com.fitme.admin.dto;

import lombok.Data;

import java.util.List;

@Data
public class OccasionRuleRequest {
    private String name;
    private String description;
    private List<String> keywords;
    private Boolean active;
}
