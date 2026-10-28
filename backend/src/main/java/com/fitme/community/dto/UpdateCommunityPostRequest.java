package com.fitme.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Edits the text of a post the signed-in user already published.
 *
 * <p>Only the words the author wrote can change — the photo, style and occasion stay as they
 * were, so a shared link keeps pointing at the same outfit.
 */
@Data
public class UpdateCommunityPostRequest {

    @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
    private String title;

    @Size(max = 2000, message = "Mô tả tối đa 2000 ký tự")
    private String caption;
}
