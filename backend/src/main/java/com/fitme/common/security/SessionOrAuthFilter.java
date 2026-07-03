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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
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
    private static final List<Pattern> PROTECTED_READ_PATTERNS = List.of(
            Pattern.compile("^/api/v1/redirects/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
    );

    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!requiresAuth(request.getMethod(), request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (hasAuthenticatedUser() || hasAnonymousSession(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8");
        byte[] body = objectMapper.writeValueAsBytes(
                ApiResponse.fail("Yêu cầu đăng nhập hoặc session ẩn danh"));
        response.getOutputStream().write(body);
    }

    private boolean requiresAuth(String method, String uri) {
        if (WRITE_METHODS.contains(method)) {
            return PROTECTED_WRITE_PATTERNS.stream().anyMatch(p -> p.matcher(uri).matches());
        }
        if ("GET".equals(method)) {
            return PROTECTED_READ_PATTERNS.stream().anyMatch(p -> p.matcher(uri).matches());
        }
        return false;
    }

    private boolean hasAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null
                && auth.isAuthenticated()
                && auth.getPrincipal() instanceof UserDetails;
    }

    private boolean hasAnonymousSession(HttpServletRequest request) {
        return request.getAttribute(RequestContext.ANONYMOUS_SESSION_ATTR) != null;
    }
}
