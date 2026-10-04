package com.fitme.analytics.controller;

import com.fitme.analytics.dto.TrafficStatsResponse;
import com.fitme.analytics.service.SiteTrafficService;
import com.fitme.common.dto.ApiResponse;
import com.fitme.common.enums.UserRole;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.FitMeUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SiteTrafficController {

    private final SiteTrafficService siteTrafficService;

    public record VisitRequest(String visitorId) {
    }

    /** Page-view beacon from the storefront. Bots and admin sessions are ignored so they do not skew traffic. */
    @PostMapping("/api/v1/analytics/visit")
    public ResponseEntity<Void> visit(@RequestBody VisitRequest request,
                                      @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        UUID visitorId;
        try {
            visitorId = UUID.fromString(request.visitorId() == null ? "" : request.visitorId().trim());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("visitorId không hợp lệ");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        FitMeUserPrincipal principal = auth != null && auth.getPrincipal() instanceof FitMeUserPrincipal p ? p : null;
        boolean admin = principal != null && principal.getRole() == UserRole.ADMIN;
        if (!admin && !SiteTrafficService.isBot(userAgent)) {
            siteTrafficService.recordVisit(visitorId, principal == null ? null : principal.getUserId());
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/v1/admin/traffic")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TrafficStatsResponse> stats(@RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(siteTrafficService.stats(days));
    }
}
