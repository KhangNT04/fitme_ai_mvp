import { z } from "zod";

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
  gender: z.enum(["FEMALE", "MALE", "OTHER"], { error: "Chọn giới tính" }),
  fitPreference: z.enum(["SLIM", "REGULAR", "RELAXED", "OVERSIZE", "UNSURE"], { error: "Chọn gu mặc" }),
  skinTone: z.enum(["FAIR", "MEDIUM", "TAN", "DEEP", "UNSURE"]).optional(),
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
  primaryStyle: z.string().optional(),
  secondaryStyles: z.array(z.string()).optional(),
  riskLevel: z.enum(["SAFE", "BALANCED", "BOLD", "EXPERIMENTAL"]).optional(),
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
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(200),
  fitPreference: z.string().min(1).optional(),
  skinTone: z.string().min(1).optional(),
  occasion: optionalTextField(),
  desiredVibe: optionalTextField(),
  usualSize: optionalTextField(),
  inputMode: z.enum(["USER_PHOTO", "AVATAR", "OUTFIT_BOARD_ONLY"]),
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

export type BodyProfileForm = z.infer<typeof bodyProfileSchema>;
export type StyleProfileForm = z.infer<typeof styleProfileSchema>;
export type OccasionForm = z.infer<typeof occasionSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type TryOnInputForm = z.infer<typeof tryOnInputSchema>;
export type BrandOnboardingForm = z.infer<typeof brandOnboardingSchema>;
