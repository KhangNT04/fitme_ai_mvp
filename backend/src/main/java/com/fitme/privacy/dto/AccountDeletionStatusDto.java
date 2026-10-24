package com.fitme.privacy.dto;

import com.fitme.common.enums.DeletionRequestStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

/** Trạng thái yêu cầu tự xoá tài khoản của chính mình. */
@Data
@Builder
public class AccountDeletionStatusDto {
    /** Id của yêu cầu; null khi người dùng chưa yêu cầu xoá. */
    private UUID requestId;
    /** PENDING khi đang chờ, CANCELLED nếu đã huỷ; null khi chưa có yêu cầu. */
    private DeletionRequestStatus status;
    private Instant requestedAt;
    /** Thời điểm tài khoản sẽ bị xoá thật; null nếu đã huỷ. */
    private Instant scheduledFor;
    /** Còn bao lâu nữa thì bị xoá (ít nhất 0); null nếu đã huỷ. */
    private Long daysRemaining;
    private String reason;
}
