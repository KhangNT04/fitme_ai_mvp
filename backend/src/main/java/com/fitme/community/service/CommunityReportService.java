package com.fitme.community.service;

import com.fitme.common.dto.PageResult;
import com.fitme.common.exception.BusinessException;
import com.fitme.common.exception.NotFoundException;
import com.fitme.community.dto.CommunityReportDto;
import com.fitme.community.dto.CreateCommunityReportRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunityReportService {

    private static final Set<String> TARGETS = Set.of("POST", "COMMENT", "USER", "CHAT_MESSAGE");
    private static final Set<String> REASONS = Set.of(
            "SPAM", "HARASSMENT", "NUDITY", "SCAM", "OFF_TOPIC", "OTHER");

    private final JdbcTemplate jdbcTemplate;
    private final CommunityService communityService;

    @Transactional
    public CommunityReportDto create(UUID reporterId, CreateCommunityReportRequest request) {
        String targetType = normalize(request.getTargetType(), TARGETS, "Loại nội dung báo cáo không hợp lệ");
        String reason = normalize(request.getReason(), REASONS, "Lý do báo cáo không hợp lệ");
        UUID targetId = request.getTargetId();
        validateTargetExists(targetType, targetId);

        Integer open = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM community_reports WHERE reporter_user_id = ? AND target_type = ? "
                        + "AND target_id = ? AND status = 'OPEN'",
                Integer.class, reporterId, targetType, targetId);
        if (open != null && open > 0) {
            throw new BusinessException("Bạn đã gửi báo cáo này rồi, vui lòng chờ xử lý");
        }

        UUID id = UUID.randomUUID();
        jdbcTemplate.update(
                "INSERT INTO community_reports "
                        + "(id, reporter_user_id, target_type, target_id, reason, detail, status, created_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, 'OPEN', NOW())",
                id, reporterId, targetType, targetId, reason, blankToNull(request.getDetail()));
        return get(id);
    }

    public PageResult<CommunityReportDto> adminList(String status, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        List<Object> params = new ArrayList<>();
        StringBuilder sql = new StringBuilder(
                "SELECT r.*, u.display_name AS reporter_name FROM community_reports r "
                        + "JOIN user_accounts u ON u.id = r.reporter_user_id WHERE 1=1");
        if (status != null && !status.isBlank()) {
            sql.append(" AND r.status = ?");
            params.add(status.trim().toUpperCase(Locale.ROOT));
        }
        sql.append(" ORDER BY r.created_at DESC LIMIT ? OFFSET ?");
        params.add(safeSize);
        params.add(Math.max(page, 0) * safeSize);
        List<CommunityReportDto> items = jdbcTemplate.query(sql.toString(), (rs, i) -> CommunityReportDto.builder()
                .id((UUID) rs.getObject("id"))
                .reporterUserId((UUID) rs.getObject("reporter_user_id"))
                .reporterDisplayName(rs.getString("reporter_name"))
                .targetType(rs.getString("target_type"))
                .targetId((UUID) rs.getObject("target_id"))
                .reason(rs.getString("reason"))
                .detail(rs.getString("detail"))
                .status(rs.getString("status"))
                .createdAt(toInstant(rs.getTimestamp("created_at")))
                .resolvedAt(toInstant(rs.getTimestamp("resolved_at")))
                .resolutionNote(rs.getString("resolution_note"))
                .build(), params.toArray());

        Long total = status == null || status.isBlank()
                ? jdbcTemplate.queryForObject("SELECT COUNT(*) FROM community_reports", Long.class)
                : jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM community_reports WHERE status = ?",
                        Long.class, status.trim().toUpperCase(Locale.ROOT));
        return new PageResult<>(items, Math.max(page, 0), safeSize, total == null ? 0L : total);
    }

    @Transactional
    public CommunityReportDto resolve(UUID adminId, UUID reportId, String status, String note, boolean hidePost) {
        String next = normalize(status, Set.of("RESOLVED", "DISMISSED"), "Trạng thái không hợp lệ");
        CommunityReportDto existing = get(reportId);
        if (!"OPEN".equals(existing.getStatus())) {
            throw new BusinessException("Báo cáo này đã được xử lý");
        }
        jdbcTemplate.update(
                "UPDATE community_reports SET status = ?, resolved_by = ?, resolved_at = NOW(), resolution_note = ? "
                        + "WHERE id = ?",
                next, adminId, blankToNull(note), reportId);
        if (hidePost && "POST".equals(existing.getTargetType()) && "RESOLVED".equals(next)) {
            communityService.adminHide(existing.getTargetId());
        }
        return get(reportId);
    }

    private CommunityReportDto get(UUID id) {
        List<CommunityReportDto> rows = jdbcTemplate.query(
                "SELECT r.*, u.display_name AS reporter_name FROM community_reports r "
                        + "JOIN user_accounts u ON u.id = r.reporter_user_id WHERE r.id = ?",
                (rs, i) -> CommunityReportDto.builder()
                        .id((UUID) rs.getObject("id"))
                        .reporterUserId((UUID) rs.getObject("reporter_user_id"))
                        .reporterDisplayName(rs.getString("reporter_name"))
                        .targetType(rs.getString("target_type"))
                        .targetId((UUID) rs.getObject("target_id"))
                        .reason(rs.getString("reason"))
                        .detail(rs.getString("detail"))
                        .status(rs.getString("status"))
                        .createdAt(toInstant(rs.getTimestamp("created_at")))
                        .resolvedAt(toInstant(rs.getTimestamp("resolved_at")))
                        .resolutionNote(rs.getString("resolution_note"))
                        .build(),
                id);
        if (rows.isEmpty()) {
            throw new NotFoundException("Báo cáo không tồn tại");
        }
        return rows.get(0);
    }

    private void validateTargetExists(String targetType, UUID targetId) {
        Integer count = switch (targetType) {
            case "POST" -> jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM community_posts WHERE id = ?", Integer.class, targetId);
            case "COMMENT" -> jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM community_comments WHERE id = ?", Integer.class, targetId);
            case "USER" -> jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM user_accounts WHERE id = ?", Integer.class, targetId);
            case "CHAT_MESSAGE" -> jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM shop_chat_messages WHERE id = ?", Integer.class, targetId);
            default -> 0;
        };
        if (count == null || count == 0) {
            throw new NotFoundException("Nội dung báo cáo không tồn tại");
        }
    }

    private static String normalize(String raw, Set<String> allowed, String error) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException(error);
        }
        String value = raw.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(value)) {
            throw new BusinessException(error);
        }
        return value;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Instant toInstant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
