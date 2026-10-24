package com.fitme.auth.service;

import com.fitme.auth.dto.AuthResponse;
import com.fitme.auth.dto.ChangeEmailRequest;
import com.fitme.auth.dto.ConfirmEmailChangeRequest;
import com.fitme.auth.dto.EmailChangeStatusDto;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.config.FitMeProperties;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.security.RequestContext;
import com.fitme.common.time.AppClock;
import com.fitme.notification.AccountSecurityEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

/**
 * Self-service change of the sign-in email.
 *
 * <p>Two steps: the owner confirms the current password, then proves they own the new address with a
 * 6-digit code. Until that code is confirmed the account keeps signing in with the old email, so a
 * typo in the new address can never lock anyone out.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountEmailChangeService {

    /** Minimum delay between two code sends for the same account. */
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthEmailService authEmailService;
    private final AuthService authService;
    private final FitMeProperties fitMeProperties;
    private final AppClock clock;
    private final ApplicationEventPublisher events;
    private final SecureRandom secureRandom = new SecureRandom();

    /** Step 1: validate the password and mail a verification code to the new address. */
    @Transactional
    public EmailChangeStatusDto requestEmailChange(UUID userId, ChangeEmailRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu hiện tại không đúng");
        }
        String newEmail = normalize(request.getNewEmail());
        if (newEmail.equals(user.getEmail())) {
            throw new BusinessException("Email mới trùng với email đang dùng", "EMAIL_UNCHANGED");
        }
        if (userAccountRepository.existsByEmail(newEmail)) {
            throw new BusinessException("Email đã được sử dụng bởi tài khoản khác", "EMAIL_TAKEN");
        }

        Instant now = clock.now();
        // A second request replaces the first one; the old code stops working immediately.
        String code = generateNumericCode(6);
        Duration ttl = codeTtl();
        user.setPendingEmail(newEmail);
        user.setPendingEmailCode(code);
        user.setPendingEmailCodeExpiresAt(now.plus(ttl));
        user.setPendingEmailRequestedAt(now);
        userAccountRepository.save(user);

        authEmailService.sendEmailChangeVerificationCode(newEmail, code, (int) ttl.toMinutes());
        log.info("[AUTH] Email change requested for user {}; new address must confirm the code", userId);

        return status(user);
    }

    /**
     * Step 2: the code proves ownership of the new address, so the sign-in email switches over.
     * Returns a fresh session because the caller's tokens carry the old email.
     */
    @Transactional
    public AuthResponse confirmEmailChange(UUID userId, ConfirmEmailChangeRequest request) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        String pendingEmail = user.getPendingEmail();
        if (pendingEmail == null || user.getPendingEmailCode() == null) {
            throw new BusinessException("Không có yêu cầu đổi email nào đang chờ xác minh", "NO_PENDING_EMAIL_CHANGE");
        }
        Instant expiresAt = user.getPendingEmailCodeExpiresAt();
        if (expiresAt != null && clock.now().isAfter(expiresAt)) {
            clearPending(user);
            userAccountRepository.save(user);
            throw new BusinessException("Mã xác minh đã hết hạn. Hãy yêu cầu gửi lại mã.", "EMAIL_CHANGE_CODE_EXPIRED");
        }
        if (!constantTimeEquals(user.getPendingEmailCode(), request.getCode().trim())) {
            throw new BusinessException("Mã xác minh không đúng", "EMAIL_CHANGE_CODE_INVALID");
        }
        if (userAccountRepository.existsByEmail(pendingEmail)) {
            // Somebody claimed the address in the meantime — do not steal it.
            clearPending(user);
            userAccountRepository.save(user);
            throw new BusinessException("Email đã được sử dụng bởi tài khoản khác", "EMAIL_TAKEN");
        }

        String previousEmail = user.getEmail();
        user.setEmail(pendingEmail);
        // The new address is proven, so it is verified from now on.
        user.setEmailVerified(true);
        clearPending(user);
        // Sessions issued before the switch must not keep working.
        user.setPasswordChangedAt(clock.now());
        userAccountRepository.save(user);

        log.info("[AUTH] Sign-in email changed for user {}", userId);
        events.publishEvent(new AccountSecurityEvent(AccountSecurityEvent.Kind.EMAIL_CHANGED_BY_USER,
                user.getEmail(), previousEmail, user.getDisplayName(), clock.now()));
        return authService.issueSession(userId, RequestContext.isMfaVerified(), null);
    }

    /** Abandons a pending change; the account keeps its current email. */
    @Transactional
    public EmailChangeStatusDto cancelEmailChange(UUID userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        if (user.getPendingEmail() != null) {
            clearPending(user);
            userAccountRepository.save(user);
            log.info("[AUTH] Pending email change cancelled for user {}", userId);
        }
        return status(user);
    }

    @Transactional(readOnly = true)
    public EmailChangeStatusDto status(UUID userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));
        return status(user);
    }

    private EmailChangeStatusDto status(UserAccount user) {
        boolean pending = user.getPendingEmail() != null;
        return EmailChangeStatusDto.builder()
                .pendingEmail(pending ? user.getPendingEmail() : null)
                .requestedAt(pending ? user.getPendingEmailRequestedAt() : null)
                .expiresAt(pending ? user.getPendingEmailCodeExpiresAt() : null)
                .pending(pending)
                .build();
    }

    private Duration codeTtl() {
        long seconds = Math.max(60, fitMeProperties.getAuth().getVerificationTtlSeconds());
        return Duration.ofSeconds(seconds);
    }

    private static void clearPending(UserAccount user) {
        user.setPendingEmail(null);
        user.setPendingEmailCode(null);
        user.setPendingEmailCodeExpiresAt(null);
        user.setPendingEmailRequestedAt(null);
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }

    private String generateNumericCode(int digits) {
        int bound = (int) Math.pow(10, digits);
        return String.valueOf(secureRandom.nextInt(bound / 10, bound));
    }
}
