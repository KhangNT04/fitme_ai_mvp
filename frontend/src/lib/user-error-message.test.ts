import { describe, expect, it } from "vitest";
import {
  PREMIUM_REQUIRED_MESSAGE,
  TRY_ON_UNAVAILABLE_MESSAGE,
  formatUserErrorMessage,
  getUserErrorMessage,
  isPremiumRequiredError,
  isTryOnUnavailableError,
} from "./user-error-message";

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

  it("keeps Vietnamese conflict messages that contain a real question mark", () => {
    const message = "Sản phẩm đã có đánh giá hoặc lượt thử đồ nên không thể xóa vĩnh viễn. Bạn muốn giữ ở trạng thái Tạm ẩn?";
    expect(formatUserErrorMessage(message, 409)).toBe(message);
  });

  it("replaces mojibake Vietnamese with the status message", () => {
    expect(formatUserErrorMessage("Kh?ng th? x?a s?n ph?m", 409)).toBe(
      "Dữ liệu đã tồn tại hoặc xung đột với hệ thống.",
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

  it("shows the backend reason when permanent delete is refused", () => {
    const reason = "Sản phẩm đã có đánh giá, lead hoặc lịch sử thử đồ nên không thể xóa vĩnh viễn.";
    expect(getUserErrorMessage({ message: reason, status: 409 }, "Không thể xóa sản phẩm")).toBe(reason);
    expect(getUserErrorMessage({ message: "Request failed with status code 409", status: 409 }, "Không thể xóa sản phẩm")).toBe(
      "Dữ liệu đã tồn tại hoặc xung đột với hệ thống.",
    );
  });

  it("uses fallback when message is empty", () => {
    expect(getUserErrorMessage({}, { fallback: "Đăng nhập thất bại" })).toBe("Đăng nhập thất bại");
  });

  it("keeps the backend Vietnamese message for PREMIUM_REQUIRED", () => {
    const error = { message: "Tủ đồ là tính năng của FitMe Premium", status: 403, code: "PREMIUM_REQUIRED" };
    expect(isPremiumRequiredError(error)).toBe(true);
    expect(getUserErrorMessage(error)).toBe("Tủ đồ là tính năng của FitMe Premium");
  });

  it("explains PREMIUM_REQUIRED instead of a generic 403", () => {
    expect(getUserErrorMessage({ message: "Request failed with status code 403", status: 403, code: "PREMIUM_REQUIRED" })).toBe(
      PREMIUM_REQUIRED_MESSAGE,
    );
    expect(
      isPremiumRequiredError({ response: { status: 403, data: { errorCode: "PREMIUM_REQUIRED" } } }),
    ).toBe(true);
    expect(isPremiumRequiredError({ message: "x", status: 403 })).toBe(false);
  });

  it("explains try-on items that lost AI try-on support", () => {
    const stale = {
      message: "«Áo thun» không còn hỗ trợ thử đồ AI. Hãy bỏ món này và chọn sản phẩm khác.",
      status: 400,
      code: "TRY_ON_ITEM_UNAVAILABLE",
    };
    expect(isTryOnUnavailableError(stale)).toBe(true);
    expect(getUserErrorMessage(stale)).toBe(stale.message);
    expect(getUserErrorMessage({ message: "Bad Request", status: 400, code: "TRY_ON_NOT_ELIGIBLE" })).toBe(
      TRY_ON_UNAVAILABLE_MESSAGE,
    );
    expect(isTryOnUnavailableError({ message: "x", status: 400 })).toBe(false);
  });
});
