package com.fitme.admin.audit;

import com.fitme.common.security.RequestContext;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Append-only trail of admin actions on accounts; written in the caller's transaction. */
@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_DETAILS_LENGTH = 1000;
    private static final String SELECT_ENTRIES = """
            SELECT l.id, l.action, l.actor_user_id, a.email AS actor_email, l.target_user_id, t.email AS target_email,
                   l.details, l.ip_address, l.created_at
            FROM admin_audit_log l
            LEFT JOIN user_accounts a ON a.id = l.actor_user_id
            LEFT JOIN user_accounts t ON t.id = l.target_user_id
            """;

    private final JdbcTemplate jdbc;

    @Transactional
    public void record(UUID actorId, AdminAuditAction action, UUID targetId, String details) {
        String trimmed = details == null || details.length() <= MAX_DETAILS_LENGTH
                ? details
                : details.substring(0, MAX_DETAILS_LENGTH);
        jdbc.update("""
                INSERT INTO admin_audit_log (actor_user_id, action, target_user_id, details, ip_address)
                VALUES (?, ?, ?, ?, ?)
                """, actorId, action.name(), targetId, trimmed, RequestContext.clientIp());
    }

    @Transactional(readOnly = true)
    public AdminAuditEntryDto.Page list(String query, AdminAuditAction action, UUID targetId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> args = new ArrayList<>();
        if (query != null && !query.isBlank()) {
            String like = "%" + query.trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            where.append(" AND (LOWER(COALESCE(a.email, '')) LIKE ? OR LOWER(COALESCE(t.email, '')) LIKE ?)");
            args.add(like);
            args.add(like);
        }
        if (action != null) {
            where.append(" AND l.action = ?");
            args.add(action.name());
        }
        if (targetId != null) {
            where.append(" AND l.target_user_id = ?");
            args.add(targetId);
        }

        Long total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM admin_audit_log l
                LEFT JOIN user_accounts a ON a.id = l.actor_user_id
                LEFT JOIN user_accounts t ON t.id = l.target_user_id
                """ + where, Long.class, args.toArray());

        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(safeSize);
        pageArgs.add((long) safePage * safeSize);
        List<AdminAuditEntryDto> items = jdbc.query(SELECT_ENTRIES + where + " ORDER BY l.created_at DESC LIMIT ? OFFSET ?",
                (rs, i) -> map(rs), pageArgs.toArray());
        return new AdminAuditEntryDto.Page(items, total == null ? 0 : total, safePage, safeSize);
    }

    private static AdminAuditEntryDto map(ResultSet rs) throws SQLException {
        Timestamp createdAt = rs.getTimestamp("created_at");
        return new AdminAuditEntryDto(
                rs.getObject("id", UUID.class),
                AdminAuditAction.valueOf(rs.getString("action")),
                rs.getObject("actor_user_id", UUID.class),
                rs.getString("actor_email"),
                rs.getObject("target_user_id", UUID.class),
                rs.getString("target_email"),
                rs.getString("details"),
                rs.getString("ip_address"),
                createdAt == null ? null : createdAt.toInstant());
    }
}
