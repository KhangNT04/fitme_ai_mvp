package com.fitme.rewards.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class ShareClaimRequest {
    @NotBlank(message = "Vui lòng dán link bài đăng")
    @Size(max = 1000, message = "Link bài đăng quá dài")
    private String postUrl;
    private UUID tryOnRequestId;
    private UUID galleryImageId;
}
