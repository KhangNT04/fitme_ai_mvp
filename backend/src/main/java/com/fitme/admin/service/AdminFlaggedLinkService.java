package com.fitme.admin.service;

import com.fitme.common.enums.FlaggedLinkStatus;
import com.fitme.common.exception.NotFoundException;
import com.fitme.redirect.dto.FlaggedLinkResponse;
import com.fitme.redirect.entity.FlaggedLink;
import com.fitme.redirect.repository.FlaggedLinkRepository;
import com.fitme.redirect.service.RedirectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminFlaggedLinkService {

    private final FlaggedLinkRepository flaggedLinkRepository;
    private final RedirectService redirectService;

    @Transactional
    public FlaggedLinkResponse resolveLink(UUID id) {
        return redirectService.toFlaggedLinkResponse(updateStatus(id, FlaggedLinkStatus.RESOLVED));
    }

    @Transactional
    public FlaggedLinkResponse rejectLink(UUID id) {
        return redirectService.toFlaggedLinkResponse(updateStatus(id, FlaggedLinkStatus.REJECTED));
    }

    private FlaggedLink updateStatus(UUID id, FlaggedLinkStatus status) {
        FlaggedLink link = flaggedLinkRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Link không tồn tại"));
        link.setStatus(status);
        link.setResolvedAt(Instant.now());
        return flaggedLinkRepository.save(link);
    }
}
