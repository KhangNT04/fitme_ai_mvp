package com.fitme.auth.controller;

import com.fitme.AbstractIntegrationTest;
import com.fitme.auth.entity.UserAccount;
import com.fitme.common.security.FitMeUserPrincipal;
import com.fitme.support.TestDataHelper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Luồng tự đổi email đăng nhập: xác nhận mật khẩu → mã 6 số gửi tới email mới → đổi email.
 * Cho tới khi xác minh, tài khoản vẫn đăng nhập được bằng email cũ.
 */
class AccountEmailChangeIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void requestingAChange_storesThePendingEmailWithoutTouchingTheSignInEmail() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String originalEmail = account.getEmail();

        mockMvc.perform(post("/api/v1/me/email/request")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","newEmail":"new-mail@example.com"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pending").value(true))
                .andExpect(jsonPath("$.data.pendingEmail").value("new-mail@example.com"));

        // Email đăng nhập chưa đổi cho tới khi xác minh mã.
        assertThat(jdbc.queryForObject("SELECT email FROM user_accounts WHERE id = ?", String.class, account.getId()))
                .isEqualTo(originalEmail);
        assertThat(jdbc.queryForObject(
                "SELECT pending_email FROM user_accounts WHERE id = ?", String.class, account.getId()))
                .isEqualTo("new-mail@example.com");
    }

    @Test
    void wrongPassword_isRejectedAndNothingIsPending() throws Exception {
        UserAccount account = testDataHelper.createUser().user();

        mockMvc.perform(post("/api/v1/me/email/request")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"wrong","newEmail":"new-mail@example.com"}"""))
                .andExpect(status().isBadRequest());

        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_accounts WHERE id = ? AND pending_email IS NOT NULL",
                Integer.class, account.getId()))
                .isZero();
    }

    @Test
    void anEmailAlreadyInUse_isRejected() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        UserAccount other = testDataHelper.createUser().user();

        mockMvc.perform(post("/api/v1/me/email/request")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","newEmail":"%s"}""".formatted(other.getEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("EMAIL_TAKEN"));
    }

    @Test
    void theCurrentEmail_isRejectedAsTheNewOne() throws Exception {
        UserAccount account = testDataHelper.createUser().user();

        mockMvc.perform(post("/api/v1/me/email/request")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","newEmail":"%s"}""".formatted(account.getEmail())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("EMAIL_UNCHANGED"));
    }

    @Test
    void confirmingTheCode_switchesTheSignInEmailAndReturnsAFreshSession() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String originalEmail = account.getEmail();
        String code = requestChange(account, "confirmed-mail@example.com");

        mockMvc.perform(post("/api/v1/me/email/confirm")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"%s"}""".formatted(code)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("confirmed-mail@example.com"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());

        assertThat(jdbc.queryForObject("SELECT email FROM user_accounts WHERE id = ?", String.class, account.getId()))
                .isEqualTo("confirmed-mail@example.com");
        // Mã đã dùng thì phải bị xoá.
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_accounts WHERE id = ? AND pending_email IS NULL AND pending_email_code IS NULL",
                Integer.class, account.getId()))
                .isEqualTo(1);
        // Email cũ không còn đăng nhập được.
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"test123\"}".formatted(originalEmail)))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"confirmed-mail@example.com","password":"test123"}"""))
                .andExpect(status().isOk());
    }

    @Test
    void aWrongCode_isRejectedAndTheEmailStaysUnchanged() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String originalEmail = account.getEmail();
        requestChange(account, "wrong-code@example.com");

        mockMvc.perform(post("/api/v1/me/email/confirm")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"000000"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("EMAIL_CHANGE_CODE_INVALID"));

        assertThat(jdbc.queryForObject("SELECT email FROM user_accounts WHERE id = ?", String.class, account.getId()))
                .isEqualTo(originalEmail);
    }

    @Test
    void confirmingWithoutAPendingRequest_isRejected() throws Exception {
        UserAccount account = testDataHelper.createUser().user();

        mockMvc.perform(post("/api/v1/me/email/confirm")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"code":"123456"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("NO_PENDING_EMAIL_CHANGE"));
    }

    @Test
    void cancelling_dropsThePendingChangeAndKeepsTheCurrentEmail() throws Exception {
        UserAccount account = testDataHelper.createUser().user();
        String originalEmail = account.getEmail();
        requestChange(account, "cancelled-mail@example.com");

        mockMvc.perform(delete("/api/v1/me/email/pending")
                        .with(user(new FitMeUserPrincipal(account))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pending").value(false));

        assertThat(jdbc.queryForObject("SELECT email FROM user_accounts WHERE id = ?", String.class, account.getId()))
                .isEqualTo(originalEmail);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM user_accounts WHERE id = ? AND pending_email IS NULL",
                Integer.class, account.getId()))
                .isEqualTo(1);
    }

    @Test
    void status_isEmptyWhenNoChangeIsPending() throws Exception {
        UserAccount account = testDataHelper.createUser().user();

        mockMvc.perform(get("/api/v1/me/email").with(user(new FitMeUserPrincipal(account))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pending").value(false))
                .andExpect(jsonPath("$.data.pendingEmail").doesNotExist());
    }

    @Test
    void unauthenticatedRequest_isRejected() throws Exception {
        mockMvc.perform(post("/api/v1/me/email/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","newEmail":"new-mail@example.com"}"""))
                .andExpect(status().isUnauthorized());
    }

    /** Gửi yêu cầu đổi email và trả về mã 6 số đã lưu trong DB (mail không cấu hình trong test). */
    private String requestChange(UserAccount account, String newEmail) throws Exception {
        mockMvc.perform(post("/api/v1/me/email/request")
                        .with(user(new FitMeUserPrincipal(account)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"test123","newEmail":"%s"}""".formatted(newEmail)))
                .andExpect(status().isOk());
        return jdbc.queryForObject(
                "SELECT pending_email_code FROM user_accounts WHERE id = ?", String.class, account.getId());
    }
}
