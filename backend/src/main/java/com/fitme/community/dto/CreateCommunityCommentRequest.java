package com.fitme.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

/** Adds a comment to a post, or replies to an existing one. */
@Data
public class CreateCommunityCommentRequest {

    @NotBlank(message = "Nội dung bình luận không được để trống")
    @Size(max = 1000, message = "Bình luận không được dài quá 1000 ký tự")
    private String content;

    /** The comment being answered. Null for a top-level comment. */
    private UUID parentId;
}
