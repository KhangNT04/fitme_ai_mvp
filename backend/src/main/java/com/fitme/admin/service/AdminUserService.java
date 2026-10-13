package com.fitme.admin.service;

import com.fitme.admin.audit.AdminAuditAction;
import com.fitme.admin.audit.AdminAuditService;
import com.fitme.admin.dto.AdminCredentialsRequest;
import com.fitme.admin.dto.AdminUserDto;
import com.fitme.auth.entity.UserAccount;
import com.fitme.auth.repository.UserAccountRepository;
import com.fitme.auth.service.AuthService;
import com.fitme.notification.AccountSecurityEvent;
import com.fitme.common.enums.ConsumerPlan;
import com.fitme.common.enums.UserRole;
import com.fitme.common.enums.UserStatus;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Account directory for admins: search/filter every account and lock or unlock sign-in. */
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final Logger log = LoggerFactory.getLogger(AdminUserService.class);
    private static final int MAX_PAGE_SIZE = 100;
    private static final String SELECT_USERS = """
            SELECT u.id, u.email, u.display_name, u.role, u.status, u.email_verified, u.consumer_plan,
                   u.created_at, u.signup_source,
                   COALESCE(w.subscription_remaining + w.bonus_remaining, 0) AS fitken,
                   (SELECT MAX(a.activity_date) FROM user_activity_days a WHERE a.user_id = u.id) AS last_active,
                   (SELECT b.name FROM brands b WHERE b.owner_user_id = u.id ORDER BY b.created_at LIMIT 1) AS brand_name
            FROM user_accounts u
            LEFT JOIN fitken_wallets w ON w.user_id = u.id
            """;

    private final JdbcTemplate jdbc;
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditService audit;
    private final AuthService authService;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public AdminUserDto.Page list(String query, UserRole role, UserStatus status, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        StringBuilder where = new StringBuilder(" WHERE u.status <> 'DELETED'");
        List<Object> args = new ArrayList<>();
        if (query != null && !query.isBlank()) {
            String like = "%" + query.trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            where.append(" AND (LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.display_name, '')) LIKE ?)");
            args.add(like);
            args.add(like);
        }
        if (role != null) {
            where.append(" AND u.role = ?");
            args.add(role.name());
        }
        if (status != null) {
            where.append(" AND u.status = ?");
            args.add(status.name());
        }

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM user_accounts u" + where, Long.class, args.toArray());

        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add((long) safePage * safeSize);
        List<AdminUserDto> items = jdbc.query(SELECT_USERS + where + " ORDER BY u.created_at DESC LIMIT ? OFFSET ?",
                (rs, i) -> map(rs), pageArgs.toArray());

        return new AdminUserDto.Page(items, total == null ? 0 : total, safePage, safeSize, summary());
    }

    @Transactional
    public AdminUserDto setStatus(UUID adminId, UUID userId, UserStatus status) {
        if (status != UserStatus.ACTIVE && status != UserStatus.SUSPENDED) {
            throw new BusinessException("Trạng thái không hợp lệ (ACTIVE hoặc SUSPENDED)");
        }
        UserAccount user = userAccountRepository.findById(userId)
                .filter(u -> u.getStatus() != UserStatus.DELETED)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản"));
        if (user.getId().equals(adminId)) {
            throw new BusinessException("Bạn không thể khóa hoặc mở khóa chính tài khoản của mình");
        }
        if (status == UserStatus.SUSPENDED && user.getRole() == UserRole.ADMIN) {
            throw new BusinessException("Không thể khóa tài khoản quản trị viên");
        }
        if (user.getStatus() != status) {
            user.setStatus(status);
            if (status == UserStatus.SUSPENDED) {
                // Sessions from before the lock must not come back when the account is reactivated.
                user.setPasswordChangedAt(Instant.now());
            }
            userAccountRepository.saveAndFlush(user);
            audit.record(adminId, status == UserStatus.SUSPENDED
                    ? AdminAuditAction.USER_SUSPENDED : AdminAuditAction.USER_REACTIVATED, userId, null);
            log.info("Admin {} set account {} to {}", adminId, userId, status);
        }
        return get(userId);
    }

    /**
     * Changes the sign-in email (any non-admin account, after the admin has verified the owner's identity)
     * and/or sets a password (brand accounts only, to hand a seeded brand over to the real brand).
     * Every existing session is signed out and the owner is emailed; consumers recover access through
     * {@link #sendPasswordResetLink} instead, so admins never know a consumer's password.
     */
    @Transactional
    public AdminUserDto updateCredentials(UUID adminId, UUID userId, AdminCredentialsRequest request) {
        String email = request.email() == null || request.email().isBlank()
                ? null
                : request.email().toLowerCase(Locale.ROOT).trim();
        String password = request.password() == null || request.password().isEmpty() ? null : request.password();
        if (email == null && password == null) {
            throw new BusinessException("Nhập email mới hoặc mật khẩu mới");
        }
        UserAccount user = requireManageable(userId);
        if (password != null && user.getRole() != UserRole.BRAND_OWNER) {
            throw new BusinessException(
                    "Chỉ đặt mật khẩu trực tiếp khi bàn giao tài khoản brand. Với người dùng, hãy gửi link đặt lại mật khẩu.",
                    "PASSWORD_SET_NOT_ALLOWED");
        }
        String previousEmail = user.getEmail();
        boolean emailChanged = email != null && !email.equals(previousEmail);
        if (emailChanged) {
            if (userAccountRepository.existsByEmail(email)) {
                throw new BusinessException("Email đã được sử dụng bởi tài khoản khác", "EMAIL_TAKEN");
            }
            user.setEmail(email);
            user.setEmailVerified(true);
        }
        if (password != null) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        if (!emailChanged && password == null) {
            return get(userId);
        }
        user.setPasswordChangedAt(Instant.now());
        userAccountRepository.saveAndFlush(user);

        if (emailChanged) {
            audit.record(adminId, AdminAuditAction.USER_EMAIL_CHANGED, userId, previousEmail + " → " + email);
            events.publishEvent(new AccountSecurityEvent(AccountSecurityEvent.Kind.EMAIL_CHANGED_BY_ADMIN,
                    email, previousEmail, user.getDisplayName(), Instant.now()));
        }
        if (password != null) {
            audit.record(adminId, AdminAuditAction.USER_PASSWORD_SET, userId, "Bàn giao tài khoản brand");
            events.publishEvent(AccountSecurityEvent.of(AccountSecurityEvent.Kind.PASSWORD_SET_BY_ADMIN,
                    user.getEmail(), user.getDisplayName()));
        }
        log.info("Admin {} updated sign-in credentials of account {} (email changed: {}, password changed: {})",
                adminId, userId, emailChanged, password != null);
        return get(userId);
    }

    /** Emails the owner a one-time reset link (the normal way to help someone who forgot their password). */
    @Transactional
    public void sendPasswordResetLink(UUID adminId, UUID userId) {
        UserAccount user = requireManageable(userId);
        authService.sendPasswordResetLinkFor(user);
        audit.record(adminId, AdminAuditAction.USER_PASSWORD_RESET_LINK_SENT, userId, "Gửi tới " + user.getEmail());
        log.info("Admin {} sent a password reset link to account {}", adminId, userId);
    }

    private UserAccount requireManageable(UUID userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .filter(u -> u.getStatus() != UserStatus.DELETED)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản"));
        if (user.getRole() == UserRole.ADMIN) {
            throw new BusinessException("Không thể đổi thông tin đăng nhập của quản trị viên tại đây");
        }
        return user;
    }

    @Transactional(readOnly = true)
    public AdminUserDto get(UUID userId) {
        return jdbc.query(SELECT_USERS + " WHERE u.id = ?", (rs, i) -> map(rs), userId).stream().findFirst()
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản"));
    }

    private AdminUserDto.Summary summary() {
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE role = 'USER') AS consumers,
                       COUNT(*) FILTER (WHERE role = 'BRAND_OWNER') AS brand_owners,
                       COUNT(*) FILTER (WHERE role = 'ADMIN') AS admins,
                       COUNT(*) FILTER (WHERE status = 'SUSPENDED') AS suspended,
                       COUNT(*) FILTER (WHERE role = 'USER' AND consumer_plan = 'PREMIUM') AS premium
                FROM user_accounts WHERE status <> 'DELETED'
                """);
        return new AdminUserDto.Summary(asLong(row.get("total")), asLong(row.get("consumers")),
                asLong(row.get("brand_owners")), asLong(row.get("admins")), asLong(row.get("suspended")),
                asLong(row.get("premium")));
    }

    private static AdminUserDto map(ResultSet rs) throws SQLException {
        Timestamp createdAt = rs.getTimestamp("created_at");
        Date lastActive = rs.getDate("last_active");
        return new AdminUserDto(
                rs.getObject("id", UUID.class),
                rs.getString("email"),
                rs.getString("display_name"),
                UserRole.valueOf(rs.getString("role")),
                UserStatus.valueOf(rs.getString("status")),
                rs.getBoolean("email_verified"),
                ConsumerPlan.fromValue(rs.getString("consumer_plan")),
                rs.getInt("fitken"),
                createdAt == null ? null : createdAt.toLocalDateTime().toInstant(ZoneOffset.UTC),
                lastActive == null ? null : lastActive.toLocalDate(),
                rs.getString("brand_name"),
                rs.getString("signup_source"));
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0;
    }
}
