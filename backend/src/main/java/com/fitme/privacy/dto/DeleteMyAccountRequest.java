package com.fitme.privacy.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Xoá tài khoản của chính mình. Bắt buộc xác nhận bằng mật khẩu hiện tại (kể cả khi đã bật 2FA
 * thì vẫn phải nhập mật khẩu — mã 2FA đã được kiểm tra lúc đăng nhập).
 */
@Data
public class DeleteMyAccountRequest {
    @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại để xác nhận")
    private String currentPassword;

    /** The user must type this exactly, so nobody deletes an account by accident. */
    @NotBlank(message = "Vui lòng nhập XOA TAI KHOAN để xác nhận")
    @Pattern(regexp = "XOA TAI KHOAN", message = "Vui lòng nhập đúng cụm XOA TAI KHOAN")
    private String confirmationText;

    /** Optional: "why are you leaving" — helps product decisions, never required. */
    @Size(max = 500, message = "Lý do tối đa 500 ký tự")
    private String reason;

    /** Days until the account is really deleted; the user can cancel any time before that. */
    @Min(value = 0, message = "Số ngày chờ không hợp lệ")
    @Max(value = 90, message = "Số ngày chờ tối đa 90 ngày")
    private Integer gracePeriodDays;
}
