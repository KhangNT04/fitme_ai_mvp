package com.fitme.privacy.service;

import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.common.enums.DeletionRequestType;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.common.security.RequestContext;
import com.fitme.notification.AccountSecurityEvent;
import com.fitme.privacy.dto.AccountDeletionStatusDto;
import com.fitme.privacy.dto.DeleteMyAccountRequest;
import com.fitme.privacy.entity.DataDeletionRequest;
import com.fitme.privacy.repository.DataDeletionRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Tự xoá tài khoản của chính mình.
 *
 * <p>Người dùng xác nhận bằng mật khẩu hiện tại, rồi tài khoản bị đánh dấu xoá sau một khoảng
 * chờ (grace period). Trong khoảng chờ đó họ vẫn đăng nhập bình thường và có thể huỷ. Khi khoảng
 * chờ hết, job {@link AccountDeletionJob} xoá dữ liệu và vô hiệu hoá đăng nhập.
 *
 * <p>Khác với {@code ALL} (xoá dữ liệu, admin vẫn phải xử lý), luồng này không cần admin can thiệp.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AccountDeletionService {

    /** Mặc định chờ 7 ngày trước khi xoá thật. */
    public static final int DEFAULT_GRACE_PERIOD_DAYS = 7;
    public static final int MIN_GRACE_PERIOD_DAYS = 0;
    public static final int MAX_GRACE_PERIOD_DAYS = 90;

    private final DataDeletionRequestRepository deletionRepository;
    private final UserAccountRepository userAccountRepository;
    private final UserDataEraser userDataEraser;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;

    /**
     * Đặt lịch xoá tài khoản. Trả về trạng thái yêu cầu để frontend hiển thị ngày sẽ bị xoá.
     */
    @Transactional
    public AccountDeletionStatusDto requestDeletion(DeleteMyAccountRequest request) {
        UUID userId = RequestContext.requireUserId();
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Tài khoản không tồn tại"));

        requireDeletableRole(user);
        requireConfirmedPassword(user, request.getCurrentPassword());

        deletionRepository.findFirstByUserIdAndRequestTypeAndStatus(
                        userId, DeletionRequestType.ACCOUNT_DELETION, DeletionRequestStatus.PENDING)
                .ifPresent(existing -> {
                    throw new BusinessException(
                            "Bạn đã có một yêu cầu xoá tài khoản đang chờ. Hãy huỷ yêu cầu cũ trước nếu muốn đổi.",
                            "ACCOUNT_DELETION_ALREADY_PENDING");
                });

        int days = resolveGracePeriodDays(request.getGracePeriodDays());
        Instant scheduledFor = Instant.now().plus(days, ChronoUnit.DAYS);

        DataDeletionRequest saved = deletionRepository.save(DataDeletionRequest.builder()
                .userId(userId)
                .sessionId(RequestContext.getSessionId().orElse(null))
                .requestType(DeletionRequestType.ACCOUNT_DELETION)
                .status(DeletionRequestStatus.PENDING)
                .gracePeriodEndsAt(scheduledFor)
                .reason(normalise(request.getReason()))
                .build());

        log.info("[PRIVACY] User {} scheduled self-service account deletion in {} day(s)", userId, days);
        events.publishEvent(AccountSecurityEvent.of(AccountSecurityEvent.Kind.ACCOUNT_DELETION_SCHEDULED,
                user.getEmail(), user.getDisplayName()));
        return toStatus(saved, request.getReason());
    }

    /** Huỷ yêu cầu đang chờ; tài khoản tiếp tục dùng bình thường. */
    @Transactional
    public AccountDeletionStatusDto cancelDeletion(String reason) {
        UUID userId = RequestContext.requireUserId();
        DataDeletionRequest request = deletionRepository.findFirstByUserIdAndRequestTypeAndStatus(
                        userId, DeletionRequestType.ACCOUNT_DELETION, DeletionRequestStatus.PENDING)
                .orElseThrow(() -> new NotFoundException("Bạn không có yêu cầu xoá tài khoản nào đang chờ"));

        request.setStatus(DeletionRequestStatus.CANCELLED);
        request.setCancelledAt(Instant.now());
        request.setCancellationReason(normalise(reason));
        deletionRepository.save(request);

        log.info("[PRIVACY] User {} cancelled the pending account deletion", userId);
        userAccountRepository.findById(userId).ifPresent(user ->
                events.publishEvent(AccountSecurityEvent.of(
                        AccountSecurityEvent.Kind.ACCOUNT_DELETION_CANCELLED,
                        user.getEmail(), user.getDisplayName())));
        return toStatus(request, request.getCancellationReason());
    }

    /** Trạng thái yêu cầu hiện tại; null-status khi người dùng chưa từng yêu cầu xoá. */
    @Transactional(readOnly = true)
    public AccountDeletionStatusDto status() {
        UUID userId = RequestContext.requireUserId();
        return deletionRepository.findFirstByUserIdAndRequestTypeAndStatus(
                        userId, DeletionRequestType.ACCOUNT_DELETION, DeletionRequestStatus.PENDING)
                .map(request -> toStatus(request, null))
                .orElseGet(() -> AccountDeletionStatusDto.builder().build());
    }

    /**
     * Thực thi xoá sau khi hết grace period. Gọi bởi {@link AccountDeletionJob}; cũng dùng lại được
     * cho admin khi cần xử lý ngay một yêu cầu đã hết hạn.
     */
    @Transactional
    public void executeDeletion(UUID requestId) {
        DataDeletionRequest request = deletionRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Yêu cầu xoá tài khoản không tồn tại"));
        if (request.getStatus() != DeletionRequestStatus.PENDING) {
            return;
        }
        UUID userId = request.getUserId();
        if (userId == null) {
            request.setStatus(DeletionRequestStatus.FAILED);
            deletionRepository.save(request);
            return;
        }
        UserAccount user = userAccountRepository.findById(userId).orElse(null);
        if (user == null || user.getStatus() == UserStatus.DELETED) {
            request.setStatus(DeletionRequestStatus.COMPLETED);
            request.setCompletedAt(Instant.now());
            deletionRepository.save(request);
            return;
        }

        request.setStatus(DeletionRequestStatus.PROCESSING);
        deletionRepository.save(request);

        // Xoá dữ liệu cá nhân và ẩn danh hoá tài khoản (dùng lại đúng logic của yêu cầu "ALL").
        userDataEraser.eraseAll(userId, request.getSessionId());

        request.setStatus(DeletionRequestStatus.COMPLETED);
        request.setCompletedAt(Instant.now());
        deletionRepository.save(request);
        log.info("[PRIVACY] Self-service account deletion completed for user {}", userId);
    }

    private void requireDeletableRole(UserAccount user) {
        if (user.getRole() != UserRole.USER) {
            throw new BusinessException(
                    "Tài khoản brand/admin cần được xử lý thủ công bởi đội ngũ FitMe. "
                            + "Vui lòng liên hệ hỗ trợ để được xoá.",
                    "DELETION_MANUAL_REVIEW");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("Tài khoản này đã bị vô hiệu hoá", "ACCOUNT_LOCKED");
        }
    }

    private void requireConfirmedPassword(UserAccount user, String currentPassword) {
        if (currentPassword == null || currentPassword.isBlank()
                || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BusinessException("Mật khẩu hiện tại không đúng", "PASSWORD_INCORRECT");
        }
    }

    private int resolveGracePeriodDays(Integer requested) {
        if (requested == null) {
            return DEFAULT_GRACE_PERIOD_DAYS;
        }
        if (requested < MIN_GRACE_PERIOD_DAYS || requested > MAX_GRACE_PERIOD_DAYS) {
            throw new BusinessException(
                    "Số ngày chờ phải từ " + MIN_GRACE_PERIOD_DAYS + " đến " + MAX_GRACE_PERIOD_DAYS + " ngày");
        }
        return requested;
    }

    private AccountDeletionStatusDto toStatus(DataDeletionRequest request, String reason) {
        Instant scheduledFor = request.getGracePeriodEndsAt();
        Long daysRemaining = null;
        if (scheduledFor != null && request.getStatus() == DeletionRequestStatus.PENDING) {
            // Round up so "7 days left" does not show as 6 right after the request was made.
            double remainingDays = Duration.between(Instant.now(), scheduledFor).toMillis()
                    / (double) Duration.ofDays(1).toMillis();
            daysRemaining = Math.max(0, (long) Math.ceil(remainingDays));
        }
        return AccountDeletionStatusDto.builder()
                .requestId(request.getId())
                .status(request.getStatus())
                .requestedAt(request.getCreatedAt())
                .scheduledFor(scheduledFor)
                .daysRemaining(daysRemaining)
                .reason(reason != null ? reason : request.getReason())
                .build();
    }

    private static String normalise(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        return text.trim();
    }
}
