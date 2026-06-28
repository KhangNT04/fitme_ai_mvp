package com.fitme.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitme.common.dto.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class SessionOrAuthFilter extends OncePerRequestFilter {

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final List<Pattern> PROTECTED_WRITE_PATTERNS = List.of(
            Pattern.compile("^/api/v1/recommendations(/.*)?$"),
            Pattern.compile("^/api/v1/wardrobe(/.*)?$"),
            Pattern.compile("^/api/v1/uploads(/.*)?$"),
            Pattern.compile("^/api/v1/previews(/.*)?$"),
            Pattern.compile("^/api/v1/try-on(/.*)?$"),
            Pattern.compile("^/api/v1/me(/.*)?$"),
            Pattern.compile("^/api/v1/privacy(/.*)?$"),
            Pattern.compile("^/api/v1/redirects(/.*)?$"),
            Pattern.compile("^/api/v1/sessions/link-to-user$")
    );

    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!WRITE_METHODS.contains(request.getMethod()) || !requiresProtection(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (hasAuthenticatedUser() || hasAnonymousSession(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(
                ApiResponse.fail("Yêu cầu đăng nhập hoặc session ẩn danh")));
    }

    private boolean requiresProtection(String uri) {
        return PROTECTED_WRITE_PATTERNS.stream().anyMatch(p -> p.matcher(uri).matches());
    }

    private boolean hasAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof FitMeUserPrincipal;
    }

    private boolean hasAnonymousSession(HttpServletRequest request) {
        return request.getAttribute(RequestContext.ANONYMOUS_SESSION_ATTR) != null;
    }
}
