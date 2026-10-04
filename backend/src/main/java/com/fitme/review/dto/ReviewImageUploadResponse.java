package com.fitme.review.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewImageUploadResponse {
    private String url;
}
