package com.fitme.privacy.service;

import com.fitme.common.enums.DeletionRequestStatus;
import com.fitme.common.enums.DeletionRequestType;
import com.fitme.privacy.entity.DataDeletionRequest;
import com.fitme.privacy.repository.DataDeletionRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Thực thi các yêu cầu tự xoá tài khoản đã hết thời gian chờ.
 *
 * <p>Chạy mỗi giờ: yêu cầu được đặt lịch trước đó giờ đã hết grace period sẽ bị xoá dữ liệu và
 * vô hiệu hoá đăng nhập. Chạy lỗi trên một yêu cầu không chặn các yêu cầu còn lại.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AccountDeletionJob {

    private final DataDeletionRequestRepository deletionRepository;
    private final AccountDeletionService accountDeletionService;

    @Scheduled(cron = "0 25 * * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public int deleteExpiredAccounts() {
        List<DataDeletionRequest> due = deletionRepository.findDueForExecution(
                DeletionRequestType.ACCOUNT_DELETION.name(), DeletionRequestStatus.PENDING.name());
        int deleted = 0;
        for (DataDeletionRequest request : due) {
            try {
                accountDeletionService.executeDeletion(request.getId());
                deleted++;
            } catch (RuntimeException ex) {
                log.warn("[PRIVACY] Could not delete account for request {}: {}", request.getId(), ex.toString());
            }
        }
        if (deleted > 0) {
            log.info("[PRIVACY] Deleted {} account(s) whose grace period had ended", deleted);
        }
        return deleted;
    }
}
