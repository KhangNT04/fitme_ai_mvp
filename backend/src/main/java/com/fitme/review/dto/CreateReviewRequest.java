package com.fitme.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreateReviewRequest {
    @NotNull(message = "Vui lòng chọn số sao")
    @Min(value = 1, message = "Số sao từ 1 đến 5")
    @Max(value = 5, message = "Số sao từ 1 đến 5")
    private Integer rating;

    @NotBlank(message = "Vui lòng nhập nội dung đánh giá")
    @Size(max = 2000, message = "Nội dung đánh giá tối đa 2000 ký tự")
    private String content;

    @Size(max = 5, message = "Tối đa 5 ảnh cho mỗi đánh giá")
    private List<String> imageUrls = new ArrayList<>();
}
