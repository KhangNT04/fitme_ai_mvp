package com.fitme.common.security;

import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.UserRole;
import com.fitme.common.exception.MfaRequiredException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Blocks the admin API for admin sessions that did not sign in with a TOTP code, when that is required. */
@Component
@RequiredArgsConstructor
public class AdminMfaInterceptor implements HandlerInterceptor {

    private final FitMeProperties properties;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!properties.getAuth().isAdminMfaRequired()) {
            return true;
        }
        RequestContext.getCurrentPrincipal()
                .filter(principal -> principal.getRole() == UserRole.ADMIN && !principal.isMfaVerified())
                .ifPresent(principal -> {
                    throw new MfaRequiredException(
                            "Trang quản trị yêu cầu xác thực 2 bước. Bật 2FA trong mục Tài khoản & bảo mật rồi đăng nhập lại.");
                });
        return true;
    }
}
