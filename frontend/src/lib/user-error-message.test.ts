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

  it("maps session auth errors to a friendly message", () => {
    expect(formatUserErrorMessage("Yêu cầu đăng nhập hoặc session ẩn danh", 401)).toBe(
      "Phiên làm việc hết hạn. Vui lòng tải lại trang hoặc thử lại.",
    );
    expect(formatUserErrorMessage("Yêu c?u ??ng nh?p ho?c session ?n danh", 401)).toBe(
      "Phiên làm việc hết hạn. Vui lòng tải lại trang hoặc thử lại.",
    );
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
      "Phiên làm việc hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.",
    );
  });

  it("uses fallback when message is empty", () => {
    expect(getUserErrorMessage({}, { fallback: "Đăng nhập thất bại" })).toBe("Đăng nhập thất bại");
  });
});
