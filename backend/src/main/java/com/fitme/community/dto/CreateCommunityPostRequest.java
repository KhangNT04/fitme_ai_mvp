package com.fitme.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCommunityPostRequest {
    /** Gallery image to publish; must belong to the signed-in user. */
    private UUID galleryImageId;
    private UUID tryOnRequestId;
    private UUID recommendationId;

    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
    private String title;

    @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
    private String caption;
}
