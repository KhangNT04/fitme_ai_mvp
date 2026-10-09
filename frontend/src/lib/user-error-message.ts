const STATUS_MESSAGES: Record<number, string> = {
  400: "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
  401: "Phiên làm việc hết hạn. Vui lòng tải lại trang hoặc đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  408: "Kết nối quá thời gian. Vui lòng thử lại.",
  409: "Dữ liệu đã tồn tại hoặc xung đột với hệ thống.",
  413: "Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn.",
  422: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  429: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
  500: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  502: "Không thể kết nối máy chủ. Vui lòng thử lại sau.",
  503: "Dịch vụ tạm ngưng. Vui lòng thử lại sau.",
  504: "Máy chủ phản hồi quá chậm. Vui lòng thử lại.",
};

const CONTEXT_STATUS_MESSAGES: Partial<
  Record<UserErrorContext, Partial<Record<number, string>>>
> = {
  auth: {
    401: "Email hoặc mật khẩu không đúng.",
    403: "Bạn không có quyền đăng nhập. Vui lòng kiểm tra tài khoản.",
  },
  "brand-auth": {
    401: "Email hoặc mật khẩu không đúng.",
    403: "Tài khoản không có quyền Brand Portal. Vui lòng đăng ký brand hoặc dùng đúng email brand.",
  },
  "admin-auth": {
    401: "Email hoặc mật khẩu không đúng.",
    403: "Tài khoản không có quyền Admin. Vui lòng dùng tài khoản quản trị.",
  },
};

const TECHNICAL_MESSAGE_PATTERNS = [
  /^Request failed with status code \d+$/i,
  /^Network Error$/i,
  /^timeout of \d+ms exceeded$/i,
  /^Failed to fetch$/i,
  /^AxiosError:/i,
  /^ERR_NETWORK$/i,
  /^ECONNABORTED$/i,
];

const ENGLISH_MESSAGES: Record<string, string> = {
  Forbidden: "Bạn không có quyền truy cập.",
  Unauthorized: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  "Not Found": "Không tìm thấy dữ liệu.",
  "Internal Server Error": "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  "Bad Request": "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
  "Bad credentials": "Email hoặc mật khẩu không đúng.",
  "Access Denied": "Bạn không có quyền truy cập.",
};

export type UserErrorContext = "auth" | "brand-auth" | "admin-auth";

export interface UserErrorOptions {
  fallback?: string;
  context?: UserErrorContext;
}

const DEFAULT_FALLBACK = "Đã xảy ra lỗi. Vui lòng thử lại.";

const SESSION_AUTH_ERROR_PATTERNS = [
  /yêu cầu đăng nhập hoặc session ẩn danh/i,
  /yêu c\?u.*session/i,
  /session.*ẩn danh/i,
  /session.*\?n danh/i,
];

function isSessionAuthError(text: string): boolean {
  return SESSION_AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

function isCorruptedVietnamese(text: string): boolean {
  return /\?/.test(text) && /[a-zA-Zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text);
}

const VIETNAMESE_DIACRITICS = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

function isLikelyVietnamese(text: string): boolean {
  return VIETNAMESE_DIACRITICS.test(text);
}

function isTechnicalMessage(text: string): boolean {
  return TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function statusMessage(status: number | undefined, context?: UserErrorContext): string | undefined {
  if (!status) return undefined;
  const contextual = context ? CONTEXT_STATUS_MESSAGES[context]?.[status] : undefined;
  return contextual ?? STATUS_MESSAGES[status];
}

export function formatUserErrorMessage(
  rawMessage: string | undefined | null,
  status?: number,
  options?: UserErrorOptions
): string {
  const fallback = options?.fallback ?? DEFAULT_FALLBACK;
  const trimmed = rawMessage?.trim();

  if (trimmed) {
    if (isSessionAuthError(trimmed)) {
      return "Phiên làm việc hết hạn. Vui lòng tải lại trang hoặc thử lại.";
    }

    if (isCorruptedVietnamese(trimmed)) {
      const fromStatus = statusMessage(status, options?.context);
      return fromStatus ?? fallback;
    }

    if (isLikelyVietnamese(trimmed)) {
      return trimmed;
    }

    const translated = ENGLISH_MESSAGES[trimmed];
    if (translated) {
      return translated;
    }

    if (!isTechnicalMessage(trimmed)) {
      return trimmed;
    }
  }

  const fromStatus = statusMessage(status, options?.context);
  if (fromStatus) {
    return fromStatus;
  }

  if (!trimmed || isTechnicalMessage(trimmed)) {
    if (status === undefined && trimmed && /timeout|econnaborted/i.test(trimmed)) {
      return "Gửi mã xác nhận quá chậm hoặc SMTP lỗi. Kiểm tra SMTP trên Render rồi thử lại.";
    }
    if (status === undefined && trimmed && /network/i.test(trimmed)) {
      return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
    }
    return fallback;
  }

  return trimmed;
}

function extractErrorDetails(error: unknown): { message?: string; status?: number } {
  if (!error) return {};
  if (typeof error === "string") return { message: error };

  if (typeof error !== "object") return {};

  const candidate = error as {
    message?: string;
    status?: number;
    response?: { status?: number; data?: unknown };
  };

  const status = candidate.status ?? candidate.response?.status;
  const data = candidate.response?.data;

  if (data && typeof data === "object") {
    const payload = data as { error?: string; message?: string };
    if (payload.error?.trim()) return { message: payload.error.trim(), status };
    if (payload.message?.trim()) return { message: payload.message.trim(), status };
  }

  if (typeof data === "string" && data.trim()) {
    return { message: data.trim(), status };
  }

  if (candidate.message?.trim()) {
    return { message: candidate.message.trim(), status };
  }

  return { status };
}

export const PREMIUM_REQUIRED_CODE = "PREMIUM_REQUIRED";
export const PREMIUM_REQUIRED_MESSAGE =
  "Tính năng này dành cho FitMe Premium. Nâng cấp tại trang Bảng giá để sử dụng.";

function extractErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: unknown; response?: { data?: unknown } };
  if (typeof candidate.code === "string") return candidate.code;
  const data = candidate.response?.data;
  if (data && typeof data === "object") {
    const code = (data as { errorCode?: unknown }).errorCode;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/** True when the API refused a FitMe Premium-only feature (HTTP 403, errorCode PREMIUM_REQUIRED). */
export function isPremiumRequiredError(error: unknown): boolean {
  return extractErrorCode(error) === PREMIUM_REQUIRED_CODE;
}

export function getUserErrorMessage(
  error: unknown,
  options?: string | UserErrorOptions
): string {
  const normalizedOptions: UserErrorOptions =
    typeof options === "string" ? { fallback: options } : (options ?? {});

  const { message, status } = extractErrorDetails(error);
  if (isPremiumRequiredError(error)) {
    const trimmed = message?.trim();
    return trimmed && isLikelyVietnamese(trimmed) && !isCorruptedVietnamese(trimmed)
      ? trimmed
      : PREMIUM_REQUIRED_MESSAGE;
  }
  if (isTryOnUnavailableError(error)) {
    const trimmed = message?.trim();
    return trimmed && isLikelyVietnamese(trimmed) && !isCorruptedVietnamese(trimmed)
      ? trimmed
      : TRY_ON_UNAVAILABLE_MESSAGE;
  }
  return formatUserErrorMessage(message, status, normalizedOptions);
}

export const TRY_ON_UNAVAILABLE_MESSAGE =
  "Sản phẩm này không còn hỗ trợ thử đồ AI. Hãy bỏ món này khỏi outfit và chọn sản phẩm khác.";

/**
 * The product was hidden, made ineligible or lost the brand's try-on photo: TRY_ON_NOT_ELIGIBLE when adding it,
 * TRY_ON_ITEM_UNAVAILABLE when generating an outfit that still holds it.
 */
export function isTryOnUnavailableError(error: unknown): boolean {
  const code = extractErrorCode(error);
  return code === "TRY_ON_NOT_ELIGIBLE" || code === "TRY_ON_ITEM_UNAVAILABLE";
}
