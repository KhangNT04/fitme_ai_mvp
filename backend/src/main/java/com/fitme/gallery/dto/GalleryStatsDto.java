package com.fitme.gallery.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GalleryStatsDto {
    private long totalImages;
    private long imagesLast7Days;
    private long usersWithImages;
}
