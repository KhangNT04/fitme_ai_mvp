import { z } from "zod";

const UNSET_SELECT = "__none__";

/** Normalize empty / null / sentinel select values to undefined for optional fields. */
function unsetOptionalValue(value: unknown): unknown {
  if (value === null || value === undefined || value === "" || value === UNSET_SELECT) {
    return undefined;
  }
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}

function optionalEnumField<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(unsetOptionalValue, z.enum(values).optional());
}

function optionalStringField() {
  return z.preprocess(unsetOptionalValue, z.string().optional());
}

/** Treat empty / missing as unset for optional text fields. */
function optionalTextField() {
  return z
    .union([z.string(), z.literal(""), z.undefined()])
    .transform((value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    });
}

/** Optional body measurement — empty inputs are normalized via optionalNumberRegisterOptions. */
function optionalMeasurementField(min: number, max: number) {
  return z
    .number({ error: "Nhập số hợp lệ" })
    .min(min, `Tối thiểu ${min}cm`)
    .max(max, `Tối đa ${max}cm`)
    .optional();
}

export const bodyProfileSchema = z.object({
  heightCm: z.number({ error: "Nhập chiều cao" }).min(100, "Chiều cao tối thiểu 100cm").max(230, "Chiều cao tối đa 230cm"),
  weightKg: z.number({ error: "Nhập cân nặng" }).min(25, "Cân nặng tối thiểu 25kg").max(250, "Cân nặng tối đa 250kg"),
  age: z.number({ error: "Nhập tuổi" }).int("Tuổi phải là số nguyên").min(13, "Tuổi tối thiểu 13").max(80, "Tuổi tối đa 80"),
  gender: z.enum(["FEMALE", "MALE", "OTHER"], { error: "Chọn giới tính" }),
  fitPreference: z.enum(["SLIM", "REGULAR", "RELAXED", "OVERSIZE", "UNSURE"], { error: "Chọn gu mặc" }),
  skinTone: optionalEnumField(["FAIR", "MEDIUM", "TAN", "DEEP", "UNSURE"]),
  goals: z.array(z.string()).optional(),
  shoulderWidthCm: optionalMeasurementField(20, 80),
  chestCm: optionalMeasurementField(50, 200),
  waistCm: optionalMeasurementField(40, 180),
  abdomenCm: optionalMeasurementField(40, 180),
  hipCm: optionalMeasurementField(50, 200),
  thighCm: optionalMeasurementField(30, 100),
  inseamCm: optionalMeasurementField(50, 120),
  armLengthCm: optionalMeasurementField(40, 90),
});

export const styleProfileSchema = z.object({
  primaryStyle: optionalStringField(),
  secondaryStyles: z.array(z.string()).optional(),
  riskLevel: optionalEnumField(["SAFE", "BALANCED", "BOLD", "EXPERIMENTAL"]),
  artisticMode: z.boolean().optional(),
  preferredColors: z.array(z.string()).optional(),
  avoidedColors: z.array(z.string()).optional(),
});

export const occasionSchema = z.object({
  occasion: optionalTextField().optional(),
  desiredVibe: optionalTextField().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  wardrobeMode: z.enum(["NEW_ITEMS_ONLY", "MIX_WARDROBE_AND_BRAND", "USE_WARDROBE_FIRST", "NO_WARDROBE_DATA"]),
});

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100, "Mật khẩu tối đa 100 ký tự"),
  confirmPassword: z.string(),
  captchaAnswer: z.string().min(1, "Nhập đáp án xác nhận"),
  website: z.string().optional(),
  formStartedAtMs: z.number().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Nhập token"),
  newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100, "Mật khẩu tối đa 100 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự").max(100, "Mật khẩu tối đa 100 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: "Mật khẩu mới phải khác mật khẩu hiện tại",
  path: ["newPassword"],
});

export const tryOnInputSchema = z.object({
  heightCm: z.number({ error: "Nhập chiều cao" }).min(100, "Chiều cao tối thiểu 100cm").max(250, "Chiều cao tối đa 250cm"),
  weightKg: z.number({ error: "Nhập cân nặng" }).min(30, "Cân nặng tối thiểu 30kg").max(200, "Cân nặng tối đa 200kg"),
  fitPreference: z.enum(["SLIM", "REGULAR", "RELAXED", "OVERSIZE", "UNSURE"], { error: "Chọn gu mặc" }),
  skinTone: optionalEnumField(["FAIR", "MEDIUM", "TAN", "DEEP", "UNSURE"]),
  occasion: optionalTextField().optional(),
  desiredVibe: optionalTextField().optional(),
  usualSize: optionalTextField().optional(),
  inputMode: z.enum(["USER_PHOTO", "AVATAR", "OUTFIT_BOARD_ONLY"]),
  photoUploadId: z.string().uuid().optional(),
  avatarKey: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.inputMode === "USER_PHOTO" && !data.photoUploadId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cần upload và kiểm tra ảnh cá nhân",
      path: ["photoUploadId"],
    });
  }
  if (data.inputMode === "AVATAR" && !data.avatarKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cần chọn avatar mẫu",
      path: ["avatarKey"],
    });
  }
});

export const brandOnboardingSchema = z.object({
  name: z.string().min(2, "Tên thương hiệu tối thiểu 2 ký tự"),
  contactEmail: z.string().email("Email không hợp lệ"),
  contactPhone: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  shopeeUrl: z.string().optional(),
  tiktokShopUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  description: z.string().optional(),
});

/** Same rule as the backend UrlValidator: http(s) with a dotted host. */
function isHttpProductUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Every product must link to its page on the brand's store — the only way to buy it. */
export const purchaseUrlSchema = z
  .string({ error: "Link mua hàng không được để trống" })
  .trim()
  .min(1, "Link mua hàng không được để trống")
  .max(2048, "Link mua hàng tối đa 2048 ký tự")
  .refine(isHttpProductUrl, "Link mua hàng không hợp lệ, cần dạng https://... tới trang sản phẩm của cửa hàng");

const DISCOUNT_PERCENT_MESSAGE = "Phần trăm giảm phải từ 0 đến 100";

/** Admin billing plan form; discount dates are <input type="datetime-local"> values ("" = open bound). */
export const billingPlanFormSchema = z
  .object({
    code: z.string().trim().min(1, "Nhập mã gói"),
    name: z.string().trim().min(1, "Nhập tên gói"),
    audience: z.enum(["CONSUMER", "BRAND"]),
    planType: z.enum(["SUBSCRIPTION", "TOPUP"]),
    priceVnd: z.number({ error: "Nhập giá" }).int("Giá phải là số nguyên").min(1, "Giá tối thiểu 1đ"),
    fitkenAmount: z.number({ error: "Nhập số Fitken" }).int("Số Fitken phải là số nguyên").min(0, "Số Fitken không được âm"),
    billingPeriodDays: z.number().int("Chu kỳ phải là số nguyên").nullable(),
    active: z.boolean(),
    sortOrder: z.number({ error: "Nhập thứ tự hiển thị" }).int("Thứ tự phải là số nguyên"),
    discountPercent: z
      .number({ error: DISCOUNT_PERCENT_MESSAGE })
      .int("Phần trăm giảm phải là số nguyên")
      .min(0, DISCOUNT_PERCENT_MESSAGE)
      .max(100, DISCOUNT_PERCENT_MESSAGE)
      .nullable(),
    discountStartsLocal: z.string(),
    discountEndsLocal: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.planType === "SUBSCRIPTION" && (data.billingPeriodDays == null || data.billingPeriodDays < 1)) {
      ctx.addIssue({ code: "custom", message: "Chu kỳ tối thiểu 1 ngày", path: ["billingPeriodDays"] });
    }
    if (data.audience === "CONSUMER" && data.fitkenAmount < 1) {
      ctx.addIssue({ code: "custom", message: "Gói người dùng cần ít nhất 1 Fitken", path: ["fitkenAmount"] });
    }
    if (data.audience === "BRAND" && data.planType !== "SUBSCRIPTION") {
      ctx.addIssue({ code: "custom", message: "Gói brand phải là gói theo chu kỳ", path: ["planType"] });
    }
    if (data.discountStartsLocal && data.discountEndsLocal) {
      const starts = new Date(data.discountStartsLocal).getTime();
      const ends = new Date(data.discountEndsLocal).getTime();
      if (!(ends > starts)) {
        ctx.addIssue({
          code: "custom",
          message: "Thời điểm kết thúc phải sau thời điểm bắt đầu",
          path: ["discountEndsLocal"],
        });
      }
    }
  });

const VOUCHER_PERCENT_MESSAGE = "Phần trăm giảm phải từ 1 đến 99";
const VOUCHERS_PER_BRAND_MESSAGE = "Số voucher mỗi brand phải từ 1 đến 100";
const MAX_BRANDS_MESSAGE = "Số brand tối đa phải từ 1 trở lên";

/** Admin voucher campaign form; window dates are <input type="datetime-local"> values ("" = open bound). */
export const voucherCampaignFormSchema = z
  .object({
    name: z.string().trim().min(1, "Nhập tên chiến dịch").max(255, "Tên chiến dịch tối đa 255 ký tự"),
    description: z.string().max(2000, "Mô tả tối đa 2000 ký tự"),
    discountPercent: z
      .number({ error: VOUCHER_PERCENT_MESSAGE })
      .int(VOUCHER_PERCENT_MESSAGE)
      .min(1, VOUCHER_PERCENT_MESSAGE)
      .max(99, VOUCHER_PERCENT_MESSAGE),
    vouchersPerBrand: z
      .number({ error: VOUCHERS_PER_BRAND_MESSAGE })
      .int(VOUCHERS_PER_BRAND_MESSAGE)
      .min(1, VOUCHERS_PER_BRAND_MESSAGE)
      .max(100, VOUCHERS_PER_BRAND_MESSAGE),
    maxBrands: z.number({ error: MAX_BRANDS_MESSAGE }).int(MAX_BRANDS_MESSAGE).min(1, MAX_BRANDS_MESSAGE),
    validFromLocal: z.string(),
    validUntilLocal: z.string(),
    active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.validFromLocal && data.validUntilLocal) {
      const from = new Date(data.validFromLocal).getTime();
      const until = new Date(data.validUntilLocal).getTime();
      if (!(until > from)) {
        ctx.addIssue({
          code: "custom",
          message: "Thời điểm kết thúc phải sau thời điểm bắt đầu",
          path: ["validUntilLocal"],
        });
      }
    }
  });

export type SkinToneValue = "FAIR" | "MEDIUM" | "TAN" | "DEEP" | "UNSURE";
export type RiskLevelValue = "SAFE" | "BALANCED" | "BOLD" | "EXPERIMENTAL";
export type FitPreferenceValue = "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZE" | "UNSURE";

export type BodyProfileForm = {
  /** May be empty until the user fills the form; validated by bodyProfileSchema on submit. */
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: "FEMALE" | "MALE" | "OTHER";
  fitPreference?: FitPreferenceValue;
  skinTone?: SkinToneValue;
  goals?: string[];
  shoulderWidthCm?: number;
  chestCm?: number;
  waistCm?: number;
  abdomenCm?: number;
  hipCm?: number;
  thighCm?: number;
  inseamCm?: number;
  armLengthCm?: number;
};

export type StyleProfileForm = {
  primaryStyle?: string;
  secondaryStyles?: string[];
  riskLevel?: RiskLevelValue;
  artisticMode?: boolean;
  preferredColors?: string[];
  avoidedColors?: string[];
};

export type TryOnInputForm = {
  heightCm: number;
  weightKg: number;
  fitPreference: FitPreferenceValue;
  skinTone?: SkinToneValue;
  occasion?: string;
  desiredVibe?: string;
  usualSize?: string;
  inputMode: "USER_PHOTO" | "AVATAR" | "OUTFIT_BOARD_ONLY";
  photoUploadId?: string;
  avatarKey?: string;
};

export type OccasionForm = z.infer<typeof occasionSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
export type BrandOnboardingForm = z.infer<typeof brandOnboardingSchema>;
export type BillingPlanFormValues = z.infer<typeof billingPlanFormSchema>;
export type VoucherCampaignFormValues = z.infer<typeof voucherCampaignFormSchema>;
