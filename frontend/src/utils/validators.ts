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
  return z.number({ error: "Nhập số hợp lệ" }).min(min).max(max).optional();
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
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Nhập token"),
  newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
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

export type SkinToneValue = "FAIR" | "MEDIUM" | "TAN" | "DEEP" | "UNSURE";
export type RiskLevelValue = "SAFE" | "BALANCED" | "BOLD" | "EXPERIMENTAL";
export type FitPreferenceValue = "SLIM" | "REGULAR" | "RELAXED" | "OVERSIZE" | "UNSURE";

export type BodyProfileForm = {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: "FEMALE" | "MALE" | "OTHER";
  fitPreference: FitPreferenceValue;
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
export type BrandOnboardingForm = z.infer<typeof brandOnboardingSchema>;
