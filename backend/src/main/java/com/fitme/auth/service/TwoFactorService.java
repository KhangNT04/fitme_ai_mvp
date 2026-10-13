package com.fitme.auth.service;

import com.fitme.admin.audit.AdminAuditAction;
import com.fitme.admin.audit.AdminAuditService;
import com.fitme.auth.dto.TwoFactorDtos;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.enums.UserRole;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.RequestContext;
import com.fitme.notification.AccountSecurityEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.UUID;

/** TOTP enrollment and verification. Only admins can enroll for now; the check is shared with sign-in. */
@Service
@RequiredArgsConstructor
public class TwoFactorService {

    public enum Method { TOTP, RECOVERY_CODE }

    private static final String ISSUER = "FitMe AI";
    private static final int RECOVERY_CODE_COUNT = 10;

    private final UserAccountRepository userAccountRepository;
    private final TotpService totp;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditService audit;
    private final ApplicationEventPublisher events;
    private final FitMeProperties properties;

    @Transactional(readOnly = true)
    public TwoFactorDtos.Status status(UUID userId) {
        UserAccount user = requireUser(userId);
        boolean admin = user.getRole() == UserRole.ADMIN;
        return new TwoFactorDtos.Status(
                user.isTotpEnabled(),
                admin,
                admin && properties.getAuth().isAdminMfaRequired(),
                RequestContext.isMfaVerified(),
                user.isTotpEnabled() ? recoveryHashes(user).size() : 0);
    }

    /** Starts (or restarts) enrollment with a fresh secret; nothing changes for sign-in until {@link #enable}. */
    @Transactional
    public TwoFactorDtos.Setup beginSetup(UUID userId) {
        UserAccount user = requireEnrollable(userId);
        if (user.isTotpEnabled()) {
            throw new BusinessException("Xác thực 2 bước đã được bật", "MFA_ALREADY_ENABLED");
        }
        String secret = totp.newSecret();
        user.setTotpSecret(secret);
        user.setTotpLastStep(null);
        userAccountRepository.save(user);
        return new TwoFactorDtos.Setup(secret, totp.otpauthUri(ISSUER, user.getEmail(), secret));
    }

    /** Confirms the authenticator works and turns 2FA on; returns the one-time recovery codes. */
    @Transactional
    public List<String> enable(UUID userId, String password, String code) {
        UserAccount user = requireEnrollable(userId);
        if (user.isTotpEnabled()) {
            throw new BusinessException("Xác thực 2 bước đã được bật", "MFA_ALREADY_ENABLED");
        }
        if (user.getTotpSecret() == null) {
            throw new BusinessException("Hãy bắt đầu lại bước quét mã QR", "MFA_SETUP_MISSING");
        }
        requirePassword(user, password);
        OptionalLong step = totp.matchingStep(user.getTotpSecret(), code, null);
        if (step.isEmpty()) {
            throw invalidCode();
        }
        user.setTotpEnabled(true);
        user.setTotpLastStep(step.getAsLong());
        // Sessions that signed in with the password alone end here; the caller gets new tokens.
        user.setPasswordChangedAt(Instant.now());
        List<String> codes = issueRecoveryCodes(user);
        userAccountRepository.save(user);
        audit.record(userId, AdminAuditAction.MFA_ENABLED, userId, null);
        events.publishEvent(AccountSecurityEvent.of(AccountSecurityEvent.Kind.MFA_ENABLED,
                user.getEmail(), user.getDisplayName()));
        return codes;
    }

    @Transactional
    public void disable(UUID userId, String password, String code) {
        UserAccount user = requireUser(userId);
        if (!user.isTotpEnabled()) {
            throw new BusinessException("Xác thực 2 bước chưa được bật", "MFA_NOT_ENABLED");
        }
        requirePassword(user, password);
        if (verifyAndConsume(user, code).isEmpty()) {
            throw invalidCode();
        }
        user.setTotpEnabled(false);
        user.setTotpSecret(null);
        user.setTotpLastStep(null);
        user.setTotpRecoveryCodes(null);
        userAccountRepository.save(user);
        audit.record(userId, AdminAuditAction.MFA_DISABLED, userId, null);
        events.publishEvent(AccountSecurityEvent.of(AccountSecurityEvent.Kind.MFA_DISABLED,
                user.getEmail(), user.getDisplayName()));
    }

    /** Replaces every recovery code (e.g. after using some, or if the list leaked). */
    @Transactional
    public List<String> regenerateRecoveryCodes(UUID userId, String password, String code) {
        UserAccount user = requireUser(userId);
        if (!user.isTotpEnabled()) {
            throw new BusinessException("Xác thực 2 bước chưa được bật", "MFA_NOT_ENABLED");
        }
        requirePassword(user, password);
        if (verifyAndConsume(user, code).isEmpty()) {
            throw invalidCode();
        }
        List<String> codes = issueRecoveryCodes(user);
        userAccountRepository.save(user);
        return codes;
    }

    /**
     * Accepts a current authenticator code or an unused recovery code and consumes it (the caller saves the user).
     * Empty when 2FA is off or the code is wrong / already used.
     */
    public Optional<Method> verifyAndConsume(UserAccount user, String code) {
        if (!user.isTotpEnabled() || code == null || code.isBlank()) {
            return Optional.empty();
        }
        OptionalLong step = totp.matchingStep(user.getTotpSecret(), code, user.getTotpLastStep());
        if (step.isPresent()) {
            user.setTotpLastStep(step.getAsLong());
            return Optional.of(Method.TOTP);
        }
        List<String> remaining = recoveryHashes(user);
        if (remaining.remove(TotpService.hashRecoveryCode(code))) {
            user.setTotpRecoveryCodes(String.join(",", remaining));
            return Optional.of(Method.RECOVERY_CODE);
        }
        return Optional.empty();
    }

    private List<String> issueRecoveryCodes(UserAccount user) {
        List<String> codes = totp.newRecoveryCodes(RECOVERY_CODE_COUNT);
        user.setTotpRecoveryCodes(String.join(",", codes.stream().map(TotpService::hashRecoveryCode).toList()));
        return codes;
    }

    private static List<String> recoveryHashes(UserAccount user) {
        String stored = user.getTotpRecoveryCodes();
        if (stored == null || stored.isBlank()) {
            return new ArrayList<>();
        }
        return new ArrayList<>(Arrays.asList(stored.split(",")));
    }

    private void requirePassword(UserAccount user, String password) {
        if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu hiện tại không đúng", "PASSWORD_INCORRECT");
        }
    }

    private UserAccount requireEnrollable(UUID userId) {
        UserAccount user = requireUser(userId);
        if (user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Xác thực 2 bước hiện chỉ dành cho quản trị viên");
        }
        return user;
    }

    private UserAccount requireUser(UUID userId) {
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
    }

    private static BusinessException invalidCode() {
        return new BusinessException(
                "Mã xác thực không đúng hoặc đã được dùng. Kiểm tra giờ trên điện thoại rồi thử mã mới.",
                "MFA_CODE_INVALID");
    }
}
