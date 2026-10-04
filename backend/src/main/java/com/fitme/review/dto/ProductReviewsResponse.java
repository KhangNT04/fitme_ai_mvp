package com.fitme.review.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProductReviewsResponse {
    private double averageRating;
    private long totalCount;
    private int page;
    private int size;
    private List<ReviewItemDto> items;
}
