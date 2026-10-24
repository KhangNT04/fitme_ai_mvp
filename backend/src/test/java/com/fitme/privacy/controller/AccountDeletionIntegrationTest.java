package com.fitme.privacy.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.privacy.service.AccountDeletionJob;
import com.fitme.privacy.service.AccountDeletionService;
import com.fitme.support.TestDataHelper;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Luồng tự xoá tài khoản của chính mình: yêu cầu → huỷ / hết hạn → xoá. */
class AccountDeletionIntegrationTest extends AbstractIntegrationTest {

    private static final String CONFIRMATION = "XOA TAI KHOAN";

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private AccountDeletionService accountDeletionService;

    @Autowired
    private AccountDeletionJob accountDeletionJob;

    @Test
    void requestingDeletion_schedulesTheAccountAndKeepsItUsable() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String body = requestDeletion(account, "test123", CONFIRMATION, 7);

        assertThat((String) JsonPath.read(body, "$.data.status")).isEqualTo("PENDING");
        assertThat((String) JsonPath.read(body, "$.data.scheduledFor")).isNotNull();

        // Tài khoản vẫn đăng nhập được trong khoảng chờ.
        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, account.getId()))
                .isEqualTo("ACTIVE");
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM data_deletion_requests WHERE user_id = ? AND status = 'PENDING'",
                Integer.class, account.getId()))
                .isEqualTo(1);
    }

    @Test
    void theReason_isStoredWithTheRequest() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String body = mockMvc.perform(post("/api/v1/me/account-deletion")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","confirmationText":"%s","reason":"không còn dùng"}"""
                                .formatted(CONFIRMATION)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat((String) JsonPath.read(body, "$.data.reason")).isEqualTo("không còn dùng");
        assertThat(jdbc.queryForObject(
                "SELECT reason FROM data_deletion_requests WHERE user_id = ?", String.class, account.getId()))
                .isEqualTo("không còn dùng");
    }

    @Test
    void wrongPassword_isRejected() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        mockMvc.perform(post("/api/v1/me/account-deletion")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"wrong","confirmationText":"%s"}""".formatted(CONFIRMATION)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("PASSWORD_INCORRECT"));

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM data_deletion_requests WHERE user_id = ?", Integer.class, account.getId()))
                .isZero();
    }

    @Test
    void missingConfirmationPhrase_isRejected() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        mockMvc.perform(post("/api/v1/me/account-deletion")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","confirmationText":"xoa tai khoan"}"""))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM data_deletion_requests WHERE user_id = ?", Integer.class, account.getId()))
                .isZero();
    }

    @Test
    void secondRequest_isRejectedWhileOneIsPending() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        requestDeletion(account, "test123", CONFIRMATION, 7);

        mockMvc.perform(post("/api/v1/me/account-deletion")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","confirmationText":"%s"}""".formatted(CONFIRMATION)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_DELETION_ALREADY_PENDING"));
    }

    @Test
    void cancelling_keepsTheAccountAndAllowsANewRequest() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        requestDeletion(account, "test123", CONFIRMATION, 7);

        mockMvc.perform(post("/api/v1/me/account-deletion/cancel")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Đổi ý\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, account.getId()))
                .isEqualTo("ACTIVE");
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM data_deletion_requests WHERE user_id = ? AND status = 'PENDING'",
                Integer.class, account.getId()))
                .isZero();

        // Đã huỷ thì được đặt lịch lại.
        requestDeletion(account, "test123", CONFIRMATION, 7);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM data_deletion_requests WHERE user_id = ? AND status = 'PENDING'",
                Integer.class, account.getId()))
                .isEqualTo(1);
    }

    @Test
    void cancellingWithoutAPendingRequest_isNotFound() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        mockMvc.perform(post("/api/v1/me/account-deletion/cancel")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void status_isEmptyWhenNoRequestExists() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        mockMvc.perform(get("/api/v1/me/account-deletion").with(user(new FitMeUserPrincipal(account))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.requestId").doesNotExist())
                .andExpect(jsonPath("$.data.status").doesNotExist());
    }

    @Test
    void brandOwner_cannotSelfDelete() throws Exception {
        UserAccount owner = testDataHelper.createBrandOwner().user();
        mockMvc.perform(post("/api/v1/me/account-deletion")
                        .with(user(new FitMeUserPrincipal(owner)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","confirmationText":"%s"}""".formatted(CONFIRMATION)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("DELETION_MANUAL_REVIEW"));
    }

    @Test
    void unauthenticatedRequest_isRejected() throws Exception {
        mockMvc.perform(post("/api/v1/me/account-deletion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","confirmationText":"%s"}""".formatted(CONFIRMATION)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void expiredGracePeriod_erasesPersonalDataAndDisablesSignIn() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        UUID userId = account.getId();
        String originalEmail = account.getEmail();
        jdbc.update("INSERT INTO body_profiles (user_id, height_cm, weight_kg) VALUES (?, 170, 60)", userId);
        jdbc.update("INSERT INTO wardrobe_items (user_id, name) VALUES (?, 'Áo thun')", userId);

        requestDeletion(account, "test123", CONFIRMATION, 0);
        // Đẩy thời điểm xoá về quá khứ để job xử lý được.
        jdbc.update("UPDATE data_deletion_requests SET grace_period_ends_at = ? WHERE user_id = ?",
                Timestamp.from(Instant.now().minus(1, ChronoUnit.HOURS)), userId);

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM data_deletion_requests WHERE request_type = 'ACCOUNT_DELETION' AND status = 'PENDING' AND grace_period_ends_at <= now()",
                Integer.class)).isPositive();
        assertThat(accountDeletionJob.deleteExpiredAccounts()).isPositive();

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM body_profiles WHERE user_id = ?", Integer.class, userId))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM wardrobe_items WHERE user_id = ?", Integer.class, userId))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, userId))
                .isEqualTo("DELETED");
        assertThat(jdbc.queryForObject("SELECT email FROM user_accounts WHERE id = ?", String.class, userId))
                .isNotEqualTo(originalEmail);
        assertThat(jdbc.queryForObject(
                "SELECT status FROM data_deletion_requests WHERE user_id = ?", String.class, userId))
                .isEqualTo("COMPLETED");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"test123\"}".formatted(originalEmail)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void cancelledRequest_isNeverExecutedByTheJob() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        UUID userId = account.getId();
        requestDeletion(account, "test123", CONFIRMATION, 0);
        mockMvc.perform(post("/api/v1/me/account-deletion/cancel")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());
        jdbc.update("UPDATE data_deletion_requests SET grace_period_ends_at = ? WHERE user_id = ?",
                Timestamp.from(Instant.now().minus(1, ChronoUnit.HOURS)), userId);

        accountDeletionJob.deleteExpiredAccounts();

        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, userId))
                .isEqualTo("ACTIVE");
    }

    @Test
    void adminCannotProcessASelfServiceRequestEarly() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String body = requestDeletion(account, "test123", CONFIRMATION, 7);
        String requestId = (String) JsonPath.read(body, "$.data.requestId");

        FitMeUserPrincipal admin = new FitMeUserPrincipal(testDataHelper.createAdmin().user());
        mockMvc.perform(post("/api/v1/admin/privacy/deletion-requests/{id}/process", requestId).with(user(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("DELETION_SELF_SERVICE"));
    }

    @Test
    void executeDeletion_erasesTheAccountDirectly() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        UUID userId = account.getId();
        jdbc.update("INSERT INTO body_profiles (user_id, height_cm, weight_kg) VALUES (?, 165, 55)", userId);
        String body = requestDeletionUnchecked(account, "test123", CONFIRMATION, 0);
        String requestId = (String) JsonPath.read(body, "$.data.requestId");

        accountDeletionService.executeDeletion(UUID.fromString(requestId));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM body_profiles WHERE user_id = ?", Integer.class, userId))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM user_accounts WHERE id = ?", String.class, userId))
                .isEqualTo("DELETED");
    }

    private String requestDeletion(UserAccount account, String password, String confirmation, int graceDays)
            throws Exception {
        String body = requestDeletionUnchecked(account, password, confirmation, graceDays);
        assertThat((String) JsonPath.read(body, "$.data.status")).isEqualTo("PENDING");
        return body;
    }

    private String requestDeletionUnchecked(UserAccount account, String password, String confirmation, int graceDays)
            throws Exception {
        return mockMvc.perform(post("/api/v1/me/account-deletion")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","confirmationText":"%s","gracePeriodDays":%d}"""
                                .formatted(password, confirmation, graceDays)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }
}
