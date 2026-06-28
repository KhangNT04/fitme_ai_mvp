package com.fitme.admin.service;

import com.fitme.admin.dto.PreviewGenerationDto;
import com.fitme.common.enums.PreviewStatus;
import com.fitme.preview.repository.PreviewGenerationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminPreviewMonitoringService {

    private final PreviewGenerationRepository previewRepository;
    private final AdminDtoMapper adminDtoMapper;

    public List<PreviewGenerationDto> listFailedPreviews() {
        return previewRepository.findByStatus(PreviewStatus.FAILED).stream()
                .map(adminDtoMapper::toDto)
                .toList();
    }
}
