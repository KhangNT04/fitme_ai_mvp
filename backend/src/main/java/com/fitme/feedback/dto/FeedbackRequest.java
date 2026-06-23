package com.fitme.feedback.dto;

import com.fitme.common.enums.FeedbackRating;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FeedbackRequest {
    @NotNull
    private FeedbackRating rating;
    private String comment;
}
