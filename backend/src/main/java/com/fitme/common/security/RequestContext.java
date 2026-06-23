package com.fitme.common.security;

import com.fitme.session.entity.AnonymousSession;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Optional;
import java.util.UUID;

public final class RequestContext {

    public static final String ANONYMOUS_SESSION_ATTR = "fitme.anonymousSession";

    private RequestContext() {
    }

    public static Optional<UUID> getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof FitMeUserPrincipal principal) {
            return Optional.of(principal.getUserId());
        }
        return Optional.empty();
    }

    public static UUID requireUserId() {
        return getCurrentUserId().orElseThrow(() -> new IllegalStateException("Yêu cầu đăng nhập"));
    }

    public static Optional<AnonymousSession> getAnonymousSession() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return Optional.empty();
        }
        Object attr = request.getAttribute(ANONYMOUS_SESSION_ATTR);
        if (attr instanceof AnonymousSession session) {
            return Optional.of(session);
        }
        return Optional.empty();
    }

    public static Optional<UUID> getSessionId() {
        return getAnonymousSession().map(AnonymousSession::getId);
    }

    public static Optional<String> getSessionToken() {
        return getAnonymousSession().map(AnonymousSession::getSessionToken);
    }

    public static UUID requireUserOrSession() {
        return getCurrentUserId()
                .or(() -> getSessionId())
                .orElseThrow(() -> new IllegalStateException("Yêu cầu đăng nhập hoặc session ẩn danh"));
    }

    private static HttpServletRequest currentRequest() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            return servletAttrs.getRequest();
        }
        return null;
    }
}
