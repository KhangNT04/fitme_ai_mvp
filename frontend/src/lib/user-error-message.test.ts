import { describe, expect, it } from "vitest";
import { formatUserErrorMessage, getUserErrorMessage } from "./user-error-message";

describe("formatUserErrorMessage", () => {
  it("keeps Vietnamese backend messages", () => {
    expect(formatUserErrorMessage("Email đã được sử dụng", 400)).toBe("Email đã được sử dụng");
  });

  it("replaces axios technical messages with status-based Vietnamese", () => {
    expect(formatUserErrorMessage("Request failed with status code 403", 403)).toBe(
      "Bạn không có quyền thực hiện thao tác này."
    );
  });

  it("uses brand-auth context for login 403", () => {
    expect(
      formatUserErrorMessage("Request failed with status code 403", 403, {
        context: "brand-auth",
      })
    ).toBe(
      "Tài khoản không có quyền Brand Portal. Vui lòng đăng ký brand hoặc dùng đúng email brand."
    );
  });

  it("maps common English messages", () => {
    expect(formatUserErrorMessage("Forbidden", 403)).toBe("Bạn không có quyền truy cập.");
  });

  it("handles network errors without status", () => {
    expect(formatUserErrorMessage("Network Error")).toBe(
      "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại."
    );
  });
});

describe("getUserErrorMessage", () => {
  it("extracts ApiError shape from api-client", () => {
    expect(getUserErrorMessage({ message: "Request failed with status code 401", status: 401 })).toBe(
      "Email hoặc mật khẩu không đúng."
    );
  });

  it("uses fallback when message is empty", () => {
    expect(getUserErrorMessage({}, { fallback: "Đăng nhập thất bại" })).toBe("Đăng nhập thất bại");
  });
});
